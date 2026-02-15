const request = require("supertest");
const app = require("../src/app");

test("GET /api/tickets without token returns 401", async () => {
  const res = await request(app).get("/api/tickets");
  expect(res.statusCode).toBe(401);
  expect(res.body).toHaveProperty("error");
});

