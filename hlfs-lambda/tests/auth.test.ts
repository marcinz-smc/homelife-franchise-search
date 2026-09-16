import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { User } from "hlfs-mongo";
import { app, createAdmin, startMemoryMongo, stopMemoryMongo } from "./helpers";

let mongo: Awaited<ReturnType<typeof startMemoryMongo>>;

beforeAll(async () => {
  mongo = await startMemoryMongo();
});

afterAll(async () => {
  await stopMemoryMongo(mongo);
});

beforeEach(async () => {
  await User.deleteMany({});
  await createAdmin();
});

describe("auth", () => {
  it("rejects unknown credentials", async () => {
    const response = await request(app())
      .post("/api/auth/login")
      .send({ email: "admin@homelife.local", password: "wrong-password" });
    expect(response.status).toBe(401);
  });

  it("sets a session cookie and returns the current user", async () => {
    const agent = request.agent(app());
    const login = await agent
      .post("/api/auth/login")
      .send({ email: "admin@homelife.local", password: "change-me-now" });
    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe("admin@homelife.local");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe("admin");
  });

  it("blocks protected routes without a session", async () => {
    const response = await request(app()).get("/api/offices");
    expect(response.status).toBe(401);
  });
});
