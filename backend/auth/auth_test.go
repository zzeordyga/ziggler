package auth

import (
	"os"
	"testing"
	"ziggler_backend/config"
)

func TestMain(m *testing.M) {
	// Setup: Load config before running tests
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-must-be-32-characters-long")
	config.LoadConfig()

	// Run tests
	code := m.Run()

	// Cleanup
	os.Exit(code)
}

func TestGenerateToken(t *testing.T) {
	userID := 1
	email := "test@example.com"

	token, err := GenerateToken(userID, email)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	if token == "" {
		t.Error("Generated token is empty")
	}
}

func TestValidateToken(t *testing.T) {
	userID := 1
	email := "test@example.com"

	token, err := GenerateToken(userID, email)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	claims, err := ValidateToken(token)
	if err != nil {
		t.Fatalf("Failed to validate token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected UserID %d, got %d", userID, claims.UserID)
	}

	if claims.Email != email {
		t.Errorf("Expected Email %s, got %s", email, claims.Email)
	}
}

func TestHashPassword(t *testing.T) {
	password := "testpassword123"

	hashedPassword, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if hashedPassword == "" {
		t.Error("Hashed password is empty")
	}

	if hashedPassword == password {
		t.Error("Hashed password should not equal plain password")
	}
}

func TestCheckPassword(t *testing.T) {
	password := "testpassword123"

	hashedPassword, err := HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	err = CheckPassword(password, hashedPassword)
	if err != nil {
		t.Error("Expected password to match hash")
	}

	err = CheckPassword("wrongpassword", hashedPassword)
	if err == nil {
		t.Error("Expected wrong password to not match hash")
	}
}
