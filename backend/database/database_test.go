package database

import (
	"os"
	"testing"

	"ziggler_backend/config"

	"gorm.io/gorm"
)

func TestMain(m *testing.M) {
	// Each InitDB() call opens a brand-new in-memory SQLite database,
	// giving every test a clean slate (matching the per-test InitDB design).
	os.Setenv("DB_DRIVER", "sqlite")
	os.Setenv("DB_PATH", ":memory:")
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing-must-be-32-characters-long")
	config.LoadConfig()

	code := m.Run()
	os.Exit(code)
}

func TestInitDB(t *testing.T) {
	// Initialize the database
	InitDB()

	if DB == nil {
		t.Fatal("Expected DB to be initialized, got nil")
	}

	// Test that tables were created
	if !DB.Migrator().HasTable(&User{}) {
		t.Error("Expected User table to exist")
	}

	if !DB.Migrator().HasTable(&Task{}) {
		t.Error("Expected Task table to exist")
	}
}

func TestCreateUser(t *testing.T) {
	InitDB()

	user := User{
		Username:    "testuser",
		Email:       "test@example.com",
		Password:    "hashedpassword",
		Role:        RoleUser,
		DisplayName: "Test User",
	}

	result := DB.Create(&user)
	if result.Error != nil {
		t.Fatalf("Failed to create user: %v", result.Error)
	}

	if user.ID == 0 {
		t.Error("Expected user ID to be set after creation")
	}

	// Verify user was created
	var foundUser User
	DB.First(&foundUser, user.ID)

	if foundUser.Username != user.Username {
		t.Errorf("Expected username %s, got %s", user.Username, foundUser.Username)
	}

	if foundUser.Email != user.Email {
		t.Errorf("Expected email %s, got %s", user.Email, foundUser.Email)
	}
}

func TestCreateTask(t *testing.T) {
	InitDB()

	// Create a user first
	user := User{
		Username:    "taskuser",
		Email:       "task@example.com",
		Password:    "hashedpassword",
		Role:        RoleUser,
		DisplayName: "Task User",
	}
	DB.Create(&user)

	// Create a task
	task := Task{
		Title:       "Test Task",
		Description: "Test Description",
		CreatorID:   user.ID,
		Status:      TaskStatusTodo,
	}

	result := DB.Create(&task)
	if result.Error != nil {
		t.Fatalf("Failed to create task: %v", result.Error)
	}

	if task.ID == 0 {
		t.Error("Expected task ID to be set after creation")
	}

	// Verify task was created
	var foundTask Task
	DB.Preload("Creator").First(&foundTask, task.ID)

	if foundTask.Title != task.Title {
		t.Errorf("Expected title %s, got %s", task.Title, foundTask.Title)
	}

	if foundTask.CreatorID != user.ID {
		t.Errorf("Expected creator ID %d, got %d", user.ID, foundTask.CreatorID)
	}

	// Check relationship
	if foundTask.Creator.ID != user.ID {
		t.Error("Expected creator relationship to be loaded")
	}
}

func TestTaskWithAssignee(t *testing.T) {
	InitDB()

	// Create users
	creator := User{
		Username:    "creator",
		Email:       "creator@example.com",
		Password:    "password",
		DisplayName: "Creator",
	}
	DB.Create(&creator)

	assignee := User{
		Username:    "assignee",
		Email:       "assignee@example.com",
		Password:    "password",
		DisplayName: "Assignee",
	}
	DB.Create(&assignee)

	// Create task with assignee
	task := Task{
		Title:       "Assigned Task",
		Description: "Task with assignee",
		CreatorID:   creator.ID,
		AssigneeID:  &assignee.ID,
		Status:      TaskStatusInProgress,
	}

	result := DB.Create(&task)
	if result.Error != nil {
		t.Fatalf("Failed to create task with assignee: %v", result.Error)
	}

	// Verify assignee relationship
	var foundTask Task
	DB.Preload("Assignee").First(&foundTask, task.ID)

	if foundTask.AssigneeID == nil {
		t.Fatal("Expected assignee ID to be set")
	}

	if *foundTask.AssigneeID != assignee.ID {
		t.Errorf("Expected assignee ID %d, got %d", assignee.ID, *foundTask.AssigneeID)
	}

	if foundTask.Assignee == nil {
		t.Fatal("Expected assignee relationship to be loaded")
	}

	if foundTask.Assignee.ID != assignee.ID {
		t.Error("Expected correct assignee")
	}
}

func TestTaskWithParent(t *testing.T) {
	InitDB()

	// Create user
	user := User{
		Username:    "parentuser",
		Email:       "parent@example.com",
		Password:    "password",
		DisplayName: "Parent User",
	}
	DB.Create(&user)

	// Create parent task
	parentTask := Task{
		Title:       "Parent Task",
		Description: "This is the parent",
		CreatorID:   user.ID,
		Status:      TaskStatusTodo,
	}
	DB.Create(&parentTask)

	// Create child task
	childTask := Task{
		Title:       "Child Task",
		Description: "This is a subtask",
		CreatorID:   user.ID,
		ParentID:    &parentTask.ID,
		Status:      TaskStatusTodo,
	}

	result := DB.Create(&childTask)
	if result.Error != nil {
		t.Fatalf("Failed to create child task: %v", result.Error)
	}

	// Verify parent relationship
	var foundChild Task
	DB.Preload("Parent").First(&foundChild, childTask.ID)

	if foundChild.ParentID == nil {
		t.Fatal("Expected parent ID to be set")
	}

	if *foundChild.ParentID != parentTask.ID {
		t.Errorf("Expected parent ID %d, got %d", parentTask.ID, *foundChild.ParentID)
	}

	if foundChild.Parent == nil {
		t.Fatal("Expected parent relationship to be loaded")
	}

	// Verify subtasks relationship
	var foundParent Task
	DB.Preload("Subtasks").First(&foundParent, parentTask.ID)

	if len(foundParent.Subtasks) != 1 {
		t.Errorf("Expected 1 subtask, got %d", len(foundParent.Subtasks))
	}
}

func TestUpdateTask(t *testing.T) {
	InitDB()

	// Create user and task
	user := User{
		Username: "updateuser",
		Email:    "update@example.com",
		Password: "password",
	}
	DB.Create(&user)

	task := Task{
		Title:       "Original Title",
		Description: "Original Description",
		CreatorID:   user.ID,
		Status:      TaskStatusTodo,
	}
	DB.Create(&task)

	// Update task
	task.Title = "Updated Title"
	task.Status = TaskStatusDone

	result := DB.Save(&task)
	if result.Error != nil {
		t.Fatalf("Failed to update task: %v", result.Error)
	}

	// Verify update
	var foundTask Task
	DB.First(&foundTask, task.ID)

	if foundTask.Title != "Updated Title" {
		t.Errorf("Expected title 'Updated Title', got %s", foundTask.Title)
	}

	if foundTask.Status != TaskStatusDone {
		t.Errorf("Expected status %s, got %s", TaskStatusDone, foundTask.Status)
	}
}

func TestDeleteTask(t *testing.T) {
	InitDB()

	// Create user and task
	user := User{
		Username: "deleteuser",
		Email:    "delete@example.com",
		Password: "password",
	}
	DB.Create(&user)

	task := Task{
		Title:       "Task to Delete",
		Description: "Will be deleted",
		CreatorID:   user.ID,
		Status:      TaskStatusTodo,
	}
	DB.Create(&task)

	taskID := task.ID

	// Delete task (soft delete)
	result := DB.Delete(&task)
	if result.Error != nil {
		t.Fatalf("Failed to delete task: %v", result.Error)
	}

	// Verify soft delete
	var foundTask Task
	result = DB.First(&foundTask, taskID)

	if result.Error != gorm.ErrRecordNotFound {
		t.Error("Expected task to be soft deleted (not found in normal query)")
	}

	// Verify task exists with Unscoped
	result = DB.Unscoped().First(&foundTask, taskID)
	if result.Error != nil {
		t.Error("Expected task to still exist in database (soft delete)")
	}

	if foundTask.DeletedAt.Time.IsZero() {
		t.Error("Expected DeletedAt to be set")
	}
}

func TestQueryTasksByStatus(t *testing.T) {
	InitDB()

	// Create user
	user := User{
		Username: "queryuser",
		Email:    "query@example.com",
		Password: "password",
	}
	DB.Create(&user)

	// Create tasks with different statuses
	statuses := []string{TaskStatusTodo, TaskStatusInProgress, TaskStatusDone, TaskStatusCancelled}
	for _, status := range statuses {
		task := Task{
			Title:       "Task " + status,
			Description: "Test task",
			CreatorID:   user.ID,
			Status:      status,
		}
		DB.Create(&task)
	}

	// Query todo tasks
	var todoTasks []Task
	DB.Where("status = ?", TaskStatusTodo).Find(&todoTasks)

	if len(todoTasks) != 1 {
		t.Errorf("Expected 1 todo task, got %d", len(todoTasks))
	}

	// Query in_progress tasks
	var inProgressTasks []Task
	DB.Where("status = ?", TaskStatusInProgress).Find(&inProgressTasks)

	if len(inProgressTasks) != 1 {
		t.Errorf("Expected 1 in_progress task, got %d", len(inProgressTasks))
	}
}

func TestUniqueConstraints(t *testing.T) {
	InitDB()

	// Create first user
	user1 := User{
		Username: "uniqueuser",
		Email:    "unique@example.com",
		Password: "password",
	}
	DB.Create(&user1)

	// Try to create user with same username
	user2 := User{
		Username: "uniqueuser",
		Email:    "different@example.com",
		Password: "password",
	}
	result := DB.Create(&user2)

	if result.Error == nil {
		t.Error("Expected error when creating user with duplicate username")
	}

	// Try to create user with same email
	user3 := User{
		Username: "differentuser",
		Email:    "unique@example.com",
		Password: "password",
	}
	result = DB.Create(&user3)

	if result.Error == nil {
		t.Error("Expected error when creating user with duplicate email")
	}
}
