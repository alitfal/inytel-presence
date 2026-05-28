const request = require("supertest");
const app = require("../server");
const db = require("../config/db");

afterAll(async () => {
  await db.end();
});

describe("Rate limiting", () => {
  test("debe devolver 429 tras demasiados intentos de login", async () => {
    for (let i = 0; i < 15; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: "ratetest@test.com", password: "wrong" });
    }
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ratetest@test.com", password: "wrong" });
    expect(res.statusCode).toBe(429);
  },15000);
});
