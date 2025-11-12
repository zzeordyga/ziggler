package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DBPath             string
	JWTSecret          string
	AppEnv             string
	GinMode            string
	CorsAllowedOrigins string
	CorsAllowCreds     string
}

var AppConfig *Config

func LoadConfig() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	AppConfig = &Config{
		Port:               getEnv("PORT", "8080"),
		DBPath:             getEnv("DB_PATH", "ziggler.db"),
		JWTSecret:          getEnv("JWT_SECRET", ""),
		AppEnv:             getEnv("APP_ENV", "development"),
		GinMode:            getEnv("GIN_MODE", "debug"),
		CorsAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "*"),
		CorsAllowCreds:     getEnv("CORS_ALLOW_CREDENTIALS", "true"),
	}

	if AppConfig.JWTSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	if len(AppConfig.JWTSecret) < 32 {
		log.Fatal("JWT_SECRET must be at least 32 characters long for security")
	}

	log.Printf("Configuration loaded: App Environment: %s, Port: %s", AppConfig.AppEnv, AppConfig.Port)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func GetJWTSecret() []byte {
	return []byte(AppConfig.JWTSecret)
}

func IsProduction() bool {
	return AppConfig.AppEnv == "production"
}

func IsDevelopment() bool {
	return AppConfig.AppEnv == "development"
}
