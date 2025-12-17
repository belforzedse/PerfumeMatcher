#!/bin/bash
# Script to copy uploaded files from frontend/public/uploads to backend/media/uploads
# Run this on your server

set -e

FRONTEND_UPLOADS="/opt/perfume-matcher/frontend/public/uploads"
BACKEND_UPLOADS="/opt/perfume-matcher/backend/media/uploads"

echo "🔍 Checking for files in frontend uploads directory..."
echo "   Source: $FRONTEND_UPLOADS"
echo "   Destination: $BACKEND_UPLOADS"

if [ ! -d "$FRONTEND_UPLOADS" ]; then
    echo "❌ Frontend uploads directory does not exist: $FRONTEND_UPLOADS"
    exit 1
fi

# Create backend uploads directory if it doesn't exist
mkdir -p "$BACKEND_UPLOADS"

# Count files
FILE_COUNT=$(find "$FRONTEND_UPLOADS" -type f | wc -l)

if [ "$FILE_COUNT" -eq 0 ]; then
    echo "ℹ️  No files found in frontend uploads directory"
    exit 0
fi

echo "📦 Found $FILE_COUNT file(s) in frontend uploads"

# List files
echo ""
echo "Files to copy:"
find "$FRONTEND_UPLOADS" -type f -exec basename {} \; | while read -r file; do
    echo "  - $file"
done

echo ""
read -p "Copy these files to backend uploads? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted"
    exit 0
fi

# Copy files
COPIED=0
SKIPPED=0

find "$FRONTEND_UPLOADS" -type f | while read -r src_file; do
    filename=$(basename "$src_file")
    dest_file="$BACKEND_UPLOADS/$filename"
    
    if [ -f "$dest_file" ]; then
        echo "⏭️  Skipping $filename (already exists)"
        SKIPPED=$((SKIPPED + 1))
    else
        cp "$src_file" "$dest_file"
        chown deploy:deploy "$dest_file"
        chmod 644 "$dest_file"
        echo "✅ Copied $filename"
        COPIED=$((COPIED + 1))
    fi
done

echo ""
echo "✅ Copy complete!"
echo "   Copied: $COPIED file(s)"
echo "   Skipped: $SKIPPED file(s) (already exist)"

