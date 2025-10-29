#!/bin/bash

# Script to start development server and import CSV data
echo "🚀 Starting Japanese Economic Dictionary Import Process"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server in background
echo "🌐 Starting development server..."
npm run dev &
DEV_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Server failed to start. Please check the logs."
    kill $DEV_PID 2>/dev/null
    exit 1
fi

echo "✅ Server is running on http://localhost:3000"

# Run the import script
echo "📥 Importing CSV data..."
node scripts/import-via-api.js

# Check import result
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Import completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Visit http://localhost:3000/admin to access the admin panel"
    echo "2. Check the imported data in the admin interface"
    echo "3. Test the search functionality"
    echo ""
    echo "🛑 To stop the server, press Ctrl+C"
    
    # Keep the server running
    wait $DEV_PID
else
    echo "❌ Import failed. Please check the error messages above."
    kill $DEV_PID 2>/dev/null
    exit 1
fi
