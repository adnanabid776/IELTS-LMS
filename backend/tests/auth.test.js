// Mock Mongoose models
jest.mock("../models/User", () => {
  return {
    findOne: jest.fn().mockResolvedValue(null), // No user exists
    countDocuments: jest.fn().mockResolvedValue(1), // Assume other users exist
    create: jest.fn().mockImplementation((data) => ({
      ...data,
      _id: "mockUserId",
      matchPassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true),
    })),
  };
});

const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");

// Close DB connection after tests (even if mocked, good practice)
afterAll(async () => {
  await mongoose.disconnect();
});

describe("Authentication API", () => {
  it("should register a new user", async () => {
    // We don't need real data because the DB is mocked
    const res = await request(app).post("/api/auth/register").send({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "password123",
      role: "student",
    });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("token");
  });
});
