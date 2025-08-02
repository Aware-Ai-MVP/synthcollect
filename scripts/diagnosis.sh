#!/bin/bash

# Complete diagnosis script for import issues
echo "🔧 SynthCollect Import Diagnosis"
echo "================================"

# Check project structure
echo "📁 Checking project structure..."
ls -la
echo ""

# Check data directory
echo "📁 Checking data directory..."
if [ -d "data" ]; then
    echo "✅ Data directory exists"
    ls -la data/
    echo ""
    
    # Check sessions
    if [ -d "data/sessions" ]; then
        echo "📁 Sessions found:"
        cd data/sessions
        for session in *; do
            if [ -d "$session" ]; then
                echo "  📂 Session: $session"
                if [ -f "$session/session_config.json" ]; then
                    echo "    📄 Config: $(head -3 "$session/session_config.json" | grep name)"
                fi
                if [ -d "$session/images" ]; then
                    echo "    🖼️  Images: $(ls -1 "$session/images" 2>/dev/null | wc -l) files"
                    # Show first few image files
                    ls -la "$session/images" | head -5
                else
                    echo "    ❌ No images directory"
                fi
                echo ""
            fi
        done
        cd ../..
    else
        echo "❌ No sessions directory found"
    fi
    
    # Check exports
    if [ -d "data/exports" ]; then
        echo "📁 Exports found:"
        ls -la data/exports/
    else
        echo "❌ No exports directory found"
    fi
else
    echo "❌ No data directory found"
fi

echo ""
echo "🔍 Checking for recent export ZIP files..."
find . -name "*.zip" -type f -mtime -1 2>/dev/null | head -5

echo ""
echo "🔍 Checking Node.js and npm..."
node --version
npm --version

echo ""
echo "📦 Checking required packages..."
npm list jszip next @types/node

echo ""
echo "🚀 To run the debug script:"
echo "   node scripts/debug-import.js"

echo ""
echo "🔧 To test import manually, try:"
echo "   1. Export a session (make sure it has images)"
echo "   2. Check the exported ZIP file"
echo "   3. Import it and watch the console logs"