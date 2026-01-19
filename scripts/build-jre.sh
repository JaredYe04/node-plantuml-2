#!/bin/bash
# Build minimal JRE using jlink for a specific platform
# 
# Usage:
#   ./scripts/build-jre.sh <platform> <arch> [output-dir]
#
# Example:
#   ./scripts/build-jre.sh darwin arm64 runtimes/@node-plantuml-2/jre-darwin-arm64

set -e

PLATFORM=${1:-$(uname -s | tr '[:upper:]' '[:lower:]')}
ARCH=${2:-$(uname -m)}
OUTPUT_DIR=${3:-"runtimes/@node-plantuml-2/jre-${PLATFORM}-${ARCH}"}

# Normalize platform names
case "$PLATFORM" in
  darwin|macos|osx)
    PLATFORM="darwin"
    ;;
  linux)
    PLATFORM="linux"
    ;;
  win32|windows|cygwin|msys)
    PLATFORM="win32"
    ;;
  *)
    echo "Unknown platform: $PLATFORM"
    exit 1
    ;;
esac

# Normalize architecture
case "$ARCH" in
  x86_64|x64|amd64)
    ARCH="x64"
    ;;
  aarch64|arm64)
    ARCH="arm64"
    ;;
  *)
    echo "Unknown architecture: $ARCH"
    exit 1
    ;;
esac

echo "Building JRE for platform: $PLATFORM, architecture: $ARCH"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Check if jlink is available
if ! command -v jlink &> /dev/null; then
  echo "Error: jlink not found. Please install JDK 17+ with jlink."
  echo "On macOS: brew install openjdk@17"
  echo "On Ubuntu: sudo apt-get install openjdk-17-jdk"
  exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}' | awk -F '.' '{print $1}')
if [ "$JAVA_VERSION" -lt 17 ]; then
  echo "Warning: JDK 17+ recommended. Current version: $JAVA_VERSION"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR/jre"

# Build minimal JRE with jlink
echo "Running jlink..."
jlink \
  --add-modules java.base,java.desktop,java.xml,java.logging \
  --strip-debug \
  --no-man-pages \
  --no-header-files \
  --compress=2 \
  --output "$OUTPUT_DIR/jre"

# Set executable permissions (Unix platforms)
if [ "$PLATFORM" != "win32" ]; then
  echo "Setting executable permissions..."
  chmod +x "$OUTPUT_DIR/jre/bin/java"
  
  # Set permissions for all executables in bin/
  if [ -d "$OUTPUT_DIR/jre/bin" ]; then
    find "$OUTPUT_DIR/jre/bin" -type f -exec chmod +x {} \;
  fi
fi

# Verify JRE
echo ""
echo "Verifying JRE..."
"$OUTPUT_DIR/jre/bin/java" -version

echo ""
echo "✓ JRE built successfully: $OUTPUT_DIR/jre"
echo ""
echo "Next steps:"
echo "  1. Create package.json in $OUTPUT_DIR"
echo "  2. Test the JRE with PlantUML"
echo "  3. Publish the package: cd $OUTPUT_DIR && npm publish --access public"

