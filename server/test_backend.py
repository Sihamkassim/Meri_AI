#!/usr/bin/env python3
"""
Quick test to verify backend configuration and SSE endpoints
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_config():
    """Test configuration loading"""
    print("Testing configuration...")
    try:
        from config import settings
        print(f"✓ Config loaded successfully")
        print(f"  - AI Model: {settings.ai_model}")
        print(f"  - Port: {settings.port}")
        print(f"  - Environment: {settings.node_env}")
        print(f"  - Database: {settings.database_url[:50]}...")
        return True
    except Exception as e:
        print(f"✗ Config failed: {e}")
        return False

def test_imports():
    """Test critical imports"""
    print("\nTesting imports...")
    try:
        from app.graph.workflow import AstuRouteGraph
        from app.routers import ai, query, route, nearby
        print("✓ All critical imports successful")
        return True
    except Exception as e:
        print(f"✗ Import failed: {e}")
        return False

def test_graph_init():
    """Test LangGraph initialization"""
    print("\nTesting LangGraph...")
    try:
        from app.core.container import container
        graph = container.get_graph()
        print(f"✓ LangGraph initialized")
        return True
    except Exception as e:
        print(f"✗ LangGraph failed: {e}")
        return False

if __name__ == "__main__":
    print("=== ASTU Route AI Backend Test ===\n")
    
    results = []
    results.append(("Configuration", test_config()))
    results.append(("Imports", test_imports()))
    results.append(("LangGraph", test_graph_init()))
    
    print("\n=== Test Summary ===")
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status} - {name}")
    
    all_passed = all(r[1] for r in results)
    
    if all_passed:
        print("\n✓ All tests passed! Backend is ready.")
        print("\nRun the server with:")
        print("  python main.py")
        sys.exit(0)
    else:
        print("\n✗ Some tests failed. Fix errors before starting server.")
        sys.exit(1)
