#!/bin/bash

# Ziggler Docker Startup Script

set -e

echo "🚀 Starting Ziggler Task Management System"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose."
    exit 1
fi

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev       Start development environment (default)"
    echo "  prod      Start production environment"
    echo "  stop      Stop all services"
    echo "  logs      Show logs"
    echo "  clean     Stop services and remove volumes"
    echo "  build     Build all services"
    echo "  help      Show this help message"
}

# Parse command line arguments
COMMAND=${1:-dev}

case $COMMAND in
    dev)
        echo "🔧 Starting development environment..."
        docker-compose up --build
        ;;
    prod)
        echo "🏭 Starting production environment..."
        docker-compose -f docker-compose.prod.yml up --build -d
        echo "✅ Services started!"
        echo "Frontend: http://localhost:3000"
        echo "Backend: http://localhost:8080"
        ;;
    stop)
        echo "🛑 Stopping all services..."
        docker-compose down
        docker-compose -f docker-compose.prod.yml down
        echo "✅ All services stopped!"
        ;;
    logs)
        echo "📋 Showing logs..."
        docker-compose logs -f
        ;;
    clean)
        echo "🧹 Cleaning up..."
        docker-compose down -v
        docker-compose -f docker-compose.prod.yml down -v
        docker system prune -f
        echo "✅ Cleanup complete!"
        ;;
    build)
        echo "🔨 Building all services..."
        docker-compose build
        echo "✅ Build complete!"
        ;;
    help)
        show_usage
        ;;
    *)
        echo "❌ Unknown command: $COMMAND"
        show_usage
        exit 1
        ;;
esac