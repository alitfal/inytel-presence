const request = require("supertest");
const app = require("../server");
const db = require("../config/db");

let tokenAdmin = "";

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@inytel.com", password: "admin123" });
  console.log("Login response:", res.statusCode, res.body);
  tokenAdmin = res.body.token;
});

afterAll(async () => {
  await db.end();
});

describe("GET /api/empleados", () => {
  test("debe devolver 401 sin token", async () => {
    const res = await request(app).get("/api/empleados");
    expect(res.statusCode).toBe(401);
  });

  test("debe devolver 200 con token de admin", async () => {
    const res = await request(app)
      .get("/api/empleados")
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
