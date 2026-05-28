const request = require("supertest");
const app = require("../server");

describe("POST /api/auth/login", () => {
  test("debe devolver 401 con credenciales incorrectas", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "noexiste@test.com", password: "wrongpassword" });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Credenciales incorrectas");
  });

  test("debe devolver 500 si faltan campos", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({});
    expect(res.statusCode).toBe(500);
  });

//   test("debe devolver 429 tras demasiados intentos", async () => {
//     for (let i = 0; i < 10; i++) {
//       await request(app)
//         .post("/api/auth/login")
//         .send({ email: "spam@test.com", password: "wrong" });
//     }
//     const res = await request(app)
//       .post("/api/auth/login")
//       .send({ email: "spam@test.com", password: "wrong" });
//     expect(res.statusCode).toBe(429);
//   });
});

describe("POST /api/auth/recuperar", () => {
  test("debe devolver 200 aunque el email no exista", async () => {
    const res = await request(app)
      .post("/api/auth/recuperar")
      .send({ email: "noexiste123456@test.com" });
    expect(res.statusCode).toBe(200);
  });
});

const db = require("../config/db");

afterAll(async () => {
  await db.end();
});