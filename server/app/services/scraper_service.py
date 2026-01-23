"""
app/services/scraper_service.py
Web scraping service for extracting content from ASTU website and other sources.
"""
import requests
from bs4 import BeautifulSoup
import trafilatura
import html2text
from typing import List, Dict, Optional, Tuple
from urllib.parse import urljoin, urlparse
import time
import logging

logger = logging.getLogger(__name__)


class WebScraperService:
    """Service for scraping web content and preparing it for RAG"""
    
    def __init__(self, base_url: str = "https://www.astu.edu.et/"):
        """
        Initialize scraper with base URL.
        Args:
            base_url: The base URL of the website to scrape
        """
        self.base_url = base_url
        self.visited_urls = set()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def scrape_url(self, url: str, timeout: int = 10) -> Optional[Dict[str, str]]:
        """
        Scrape content from a single URL.
        
        Args:
            url: URL to scrape
            timeout: Request timeout in seconds
            
        Returns:
            Dict with title, content, url, or None if failed
        """
        try:
            logger.info(f"Scraping URL: {url}")
            response = requests.get(url, headers=self.headers, timeout=timeout)
            response.raise_for_status()
            
            # Use trafilatura for main content extraction (best for articles)
            content = trafilatura.extract(response.text, include_comments=False)
            
            # Fallback to BeautifulSoup if trafilatura fails
            if not content:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style", "nav", "footer", "header"]):
                    script.decompose()
                
                # Get text content
                content = soup.get_text(separator='\n', strip=True)
                
                # Clean up excessive whitespace
                lines = (line.strip() for line in content.splitlines())
                content = '\n'.join(line for line in lines if line)
            
            # Extract title
            soup = BeautifulSoup(response.text, 'html.parser')
            title = soup.title.string if soup.title else url.split('/')[-1]
            
            # Mark as visited
            self.visited_urls.add(url)
            
            return {
                "title": title.strip() if title else "Untitled",
                "content": content.strip(),
                "url": url,
                "source": "web-scrape"
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to scrape {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error processing {url}: {e}")
            return None
    
    def extract_links(self, url: str, same_domain_only: bool = True) -> List[str]:
        """
        Extract all links from a webpage.
        
        Args:
            url: URL to extract links from
            same_domain_only: Only return links from the same domain
            
        Returns:
            List of URLs
        """
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            links = []
            base_domain = urlparse(self.base_url).netloc
            
            for link in soup.find_all('a', href=True):
                href = link['href']
                
                # Convert relative URLs to absolute
                full_url = urljoin(url, href)
                
                # Filter by domain if needed
                if same_domain_only:
                    if urlparse(full_url).netloc == base_domain:
                        if full_url not in self.visited_urls:
                            links.append(full_url)
                else:
                    if full_url not in self.visited_urls:
                        links.append(full_url)
            
            return links
            
        except Exception as e:
            logger.error(f"Failed to extract links from {url}: {e}")
            return []
    
    def scrape_sitemap(self, sitemap_url: str = None) -> List[str]:
        """
        Extract URLs from a sitemap.xml file.
        
        Args:
            sitemap_url: URL to sitemap.xml (defaults to base_url/sitemap.xml)
            
        Returns:
            List of URLs from sitemap
        """
        if not sitemap_url:
            sitemap_url = urljoin(self.base_url, "sitemap.xml")
        
        try:
            logger.info(f"Fetching sitemap: {sitemap_url}")
            response = requests.get(sitemap_url, headers=self.headers, timeout=10)
            soup = BeautifulSoup(response.text, 'xml')
            
            urls = []
            for loc in soup.find_all('loc'):
                urls.append(loc.text)
            
            logger.info(f"Found {len(urls)} URLs in sitemap")
            return urls
            
        except Exception as e:
            logger.warning(f"Failed to fetch sitemap: {e}")
            return []
    
    def crawl_website(
        self, 
        max_pages: int = 50, 
        delay: int = 1,
        start_urls: List[str] = None
    ) -> List[Dict[str, str]]:
        """
        Crawl multiple pages from the website.
        
        Args:
            max_pages: Maximum number of pages to crawl
            delay: Delay between requests in seconds
            start_urls: List of URLs to start crawling from
            
        Returns:
            List of scraped content dictionaries
        """
        if start_urls is None:
            start_urls = [self.base_url]
        
        # Try to get sitemap first
        sitemap_urls = self.scrape_sitemap()
        if sitemap_urls:
            start_urls.extend(sitemap_urls[:max_pages])
        
        scraped_content = []
        urls_to_visit = list(set(start_urls))  # Remove duplicates
        
        logger.info(f"Starting crawl with {len(urls_to_visit)} URLs")
        
        while urls_to_visit and len(scraped_content) < max_pages:
            url = urls_to_visit.pop(0)
            
            if url in self.visited_urls:
                continue
            
            # Scrape the page
            content = self.scrape_url(url)
            if content and len(content.get('content', '')) > 100:  # Min content length
                scraped_content.append(content)
                logger.info(f"Scraped {len(scraped_content)}/{max_pages}: {content['title'][:50]}")
            
            # Find more links (but don't add too many)
            if len(scraped_content) < max_pages:
                new_links = self.extract_links(url)
                urls_to_visit.extend(new_links[:10])  # Limit new links per page
            
            # Be respectful - add delay
            time.sleep(delay)
        
        logger.info(f"Crawl complete. Scraped {len(scraped_content)} pages")
        return scraped_content
    
    def chunk_content(
        self, 
        content: str, 
        max_chunk_size: int = 1000,
        overlap: int = 200
    ) -> List[str]:
        """
        Split long content into chunks for better embedding.
        
        Args:
            content: Text content to chunk
            max_chunk_size: Maximum characters per chunk
            overlap: Number of overlapping characters between chunks
            
        Returns:
            List of content chunks
        """
        if len(content) <= max_chunk_size:
            return [content]
        
        chunks = []
        start = 0
        
        while start < len(content):
            end = start + max_chunk_size
            
            # Try to break at sentence or paragraph
            if end < len(content):
                # Look for period or newline
                break_point = content.rfind('.', start, end)
                if break_point == -1:
                    break_point = content.rfind('\n', start, end)
                if break_point != -1 and break_point > start:
                    end = break_point + 1
            
            chunks.append(content[start:end].strip())
            start = end - overlap if end < len(content) else end
        
        return chunks
    
    def prepare_documents(
        self, 
        scraped_data: List[Dict[str, str]],
        chunk_size: int = 1000
    ) -> List[Dict[str, str]]:
        """
        Prepare scraped data for database insertion.
        Handles chunking and metadata.
        
        Args:
            scraped_data: List of scraped content dicts
            chunk_size: Maximum size for content chunks
            
        Returns:
            List of prepared documents ready for insertion
        """
        documents = []
        
        for data in scraped_data:
            content = data.get('content', '')
            title = data.get('title', 'Untitled')
            url = data.get('url', '')
            
            # Chunk content if too large
            chunks = self.chunk_content(content, max_chunk_size=chunk_size)
            
            for i, chunk in enumerate(chunks):
                doc_title = title if len(chunks) == 1 else f"{title} (Part {i+1})"
                
                documents.append({
                    "title": doc_title,
                    "content": chunk,
                    "source": url,
                    "tags": ["astu-website", "web-scraped"]
                })
        
        logger.info(f"Prepared {len(documents)} documents from {len(scraped_data)} pages")
        return documents


class ASTUWebScraper(WebScraperService):
    """Specialized scraper for ASTU website"""
    
    def __init__(self):
        super().__init__(base_url="https://www.astu.edu.et/")
    
    def scrape_astu_pages(self, max_pages: int = 30) -> List[Dict[str, str]]:
        """
        Scrape important pages from ASTU website.
        
        Returns:
            List of scraped content
        """
        # Define important pages to scrape
        important_pages = [
            self.base_url,
            urljoin(self.base_url, "/about/"),
            urljoin(self.base_url, "/academics/"),
            urljoin(self.base_url, "/admissions/"),
            urljoin(self.base_url, "/research/"),
            urljoin(self.base_url, "/campus-life/"),
            urljoin(self.base_url, "/contact/"),
        ]
        
        return self.crawl_website(
            max_pages=max_pages,
            delay=2,  # Be respectful to the server
            start_urls=important_pages
        )
