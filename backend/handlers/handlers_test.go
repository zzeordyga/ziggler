package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"

	"ziggler_backend/auth"
	"ziggler_backend/config"
	"ziggler_backend/database"
	"ziggler_backend/router"

	"github.com/gin-gonic/gin"
)

var engine *gin.Engine

func TestMain(m *testing.M) {
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-must-be-32-characters-long")
	os.Setenv("DB_PATH", ":memory:")
	os.Setenv("GIN_MODE", "test")

	config.LoadConfig()
	database.InitDB()

	engine = router.New()

	code := m.Run()
	os.Exit(code)
}

func do(t *testing.T, method, path, token string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		reader = bytes.NewReader(b)
	} else {
		reader = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rr := httptest.NewRecorder()
	engine.ServeHTTP(rr, req)
	return rr
}

func registerAndLogin(t *testing.T, username string) (token string, userID uint) {
	t.Helper()
	rr := do(t, "POST", "/api/v1/auth/register", "", map[string]string{
		"username":     username,
		"email":        username + "@example.com",
		"password":     "password123",
		"display_name": username,
	})
	if rr.Code != http.StatusCreated && rr.Code != http.StatusConflict {
		t.Fatalf("register failed: %d %s", rr.Code, rr.Body.String())
	}
	rr = do(t, "POST", "/api/v1/auth/login", "", map[string]string{
		"email":    username + "@example.com",
		"password": "password123",
	})
	if rr.Code != http.StatusOK {
		t.Fatalf("login failed: %d %s", rr.Code, rr.Body.String())
	}
	var res struct {
		Token string `json:"token"`
		User  struct {
			ID uint `json:"id"`
		} `json:"user"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &res); err != nil {
		t.Fatalf("bad login response: %v", err)
	}
	return res.Token, res.User.ID
}

func TestHealth(t *testing.T) {
	rr := do(t, "GET", "/api/v1/health", "", nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	var res map[string]string
	json.Unmarshal(rr.Body.Bytes(), &res)
	if res["status"] != "healthy" {
		t.Errorf("expected healthy, got %q", res["status"])
	}
}

func TestRegisterLoginFlow(t *testing.T) {
	token, _ := registerAndLogin(t, "flowuser")
	if token == "" {
		t.Fatal("expected non-empty token")
	}
}

func TestRegisterDuplicateEmail(t *testing.T) {
	registerAndLogin(t, "dupuser")
	rr := do(t, "POST", "/api/v1/auth/register", "", map[string]string{
		"username":     "dupuser2",
		"email":        "dupuser@example.com",
		"password":     "password123",
		"display_name": "dupuser2",
	})
	if rr.Code != http.StatusConflict {
		t.Errorf("expected 409 for duplicate email, got %d", rr.Code)
	}
}

func TestLoginInvalidCredentials(t *testing.T) {
	registerAndLogin(t, "badlogin")
	rr := do(t, "POST", "/api/v1/auth/login", "", map[string]string{
		"email":    "badlogin@example.com",
		"password": "wrongpassword",
	})
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}

func TestProtectedRoutesRequireAuth(t *testing.T) {
	for _, tc := range []struct{ method, path string }{
		{"GET", "/api/v1/tasks"},
		{"GET", "/api/v1/profile"},
		{"GET", "/api/v1/users"},
		{"GET", "/api/v1/stats"},
	} {
		rr := do(t, tc.method, tc.path, "", nil)
		if rr.Code != http.StatusUnauthorized {
			t.Errorf("%s %s without token: expected 401, got %d", tc.method, tc.path, rr.Code)
		}
	}
}

func TestProfile(t *testing.T) {
	token, _ := registerAndLogin(t, "profileuser")
	rr := do(t, "GET", "/api/v1/profile", token, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	var res map[string]any
	json.Unmarshal(rr.Body.Bytes(), &res)
	if res["email"] != "profileuser@example.com" {
		t.Errorf("unexpected profile email: %v", res["email"])
	}
}

func TestTaskCRUD(t *testing.T) {
	token, _ := registerAndLogin(t, "taskuser")

	// Create
	rr := do(t, "POST", "/api/v1/tasks", token, map[string]any{
		"title":       "Write tests",
		"description": "Cover the API surface",
	})
	if rr.Code != http.StatusCreated {
		t.Fatalf("create task: expected 201, got %d %s", rr.Code, rr.Body.String())
	}
	var task struct {
		ID uint `json:"id"`
	}
	json.Unmarshal(rr.Body.Bytes(), &task)
	if task.ID == 0 {
		t.Fatal("expected task id")
	}

	// List (paginated response: {data: [...], total, ...})
	rr = do(t, "GET", "/api/v1/tasks", token, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("list tasks: expected 200, got %d", rr.Code)
	}
	var list struct {
		Data   []map[string]any `json:"data"`
		Total  int              `json:"total"`
	}
	json.Unmarshal(rr.Body.Bytes(), &list)
	if len(list.Data) == 0 {
		t.Error("expected at least one task")
	}

	// Get by id
	rr = do(t, "GET", "/api/v1/tasks/"+strconv.Itoa(int(task.ID)), token, nil)
	if rr.Code != http.StatusOK {
		t.Errorf("get task: expected 200, got %d", rr.Code)
	}

	// Update
	rr = do(t, "PUT", "/api/v1/tasks/"+strconv.Itoa(int(task.ID)), token, map[string]any{
		"title":  "Write more tests",
		"status": database.TaskStatusInProgress,
	})
	if rr.Code != http.StatusOK {
		t.Errorf("update task: expected 200, got %d %s", rr.Code, rr.Body.String())
	}

	// Subtasks: create a child then list
	rr = do(t, "POST", "/api/v1/tasks", token, map[string]any{
		"title":     "Subtask",
		"parent_id": task.ID,
	})
	if rr.Code != http.StatusCreated {
		t.Fatalf("create subtask: expected 201, got %d %s", rr.Code, rr.Body.String())
	}
	var subtask struct {
		ID uint `json:"id"`
	}
	json.Unmarshal(rr.Body.Bytes(), &subtask)
	rr = do(t, "GET", "/api/v1/tasks/"+strconv.Itoa(int(task.ID))+"/subtasks", token, nil)
	if rr.Code != http.StatusOK {
		t.Errorf("subtasks: expected 200, got %d", rr.Code)
	}

	// Parent with subtasks cannot be deleted (guarded by handler)
	rr = do(t, "DELETE", "/api/v1/tasks/"+strconv.Itoa(int(task.ID)), token, nil)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("delete parent with subtasks: expected 400, got %d", rr.Code)
	}

	// Delete subtask, then parent (soft delete -> 204)
	rr = do(t, "DELETE", "/api/v1/tasks/"+strconv.Itoa(int(subtask.ID)), token, nil)
	if rr.Code != http.StatusNoContent {
		t.Errorf("delete subtask: expected 204, got %d", rr.Code)
	}
	rr = do(t, "DELETE", "/api/v1/tasks/"+strconv.Itoa(int(task.ID)), token, nil)
	if rr.Code != http.StatusNoContent {
		t.Errorf("delete task: expected 204, got %d", rr.Code)
	}
}

func TestStats(t *testing.T) {
	token, _ := registerAndLogin(t, "statsuser")
	do(t, "POST", "/api/v1/tasks", token, map[string]any{"title": "Stats task"})
	rr := do(t, "GET", "/api/v1/stats", token, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	var res struct {
		Overall struct {
			TotalTasks int `json:"total_tasks"`
		} `json:"overall_stats"`
	}
	json.Unmarshal(rr.Body.Bytes(), &res)
	if res.Overall.TotalTasks == 0 {
		t.Errorf("expected total_tasks > 0 in stats overall_stats")
	}
}

func TestAuthValidation(t *testing.T) {
	// Garbage token
	rr := do(t, "GET", "/api/v1/tasks", "garbage-token", nil)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for garbage token, got %d", rr.Code)
	}

	// Token with valid signature but nonexistent user
	tok, _ := auth.GenerateToken(99999, "ghost@example.com")
	rr = do(t, "GET", "/api/v1/tasks", tok, nil)
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for unknown user token, got %d", rr.Code)
	}
}