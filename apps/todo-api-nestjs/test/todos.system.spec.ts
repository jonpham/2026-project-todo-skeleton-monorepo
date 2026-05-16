import "reflect-metadata";
import { execSync } from "child_process";
import path from "path";
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";

const TEST_DATABASE_URL = "file:./test.db";
const APP_ROOT = path.resolve(import.meta.dirname, "..");

let app: INestApplication;
let prisma: PrismaClient;

beforeAll(async () => {
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  execSync("node_modules/.bin/prisma migrate deploy", {
    cwd: APP_ROOT,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  prisma = new PrismaClient({
    datasources: { db: { url: TEST_DATABASE_URL } },
  });
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

afterEach(async () => {
  await prisma.todo.deleteMany();
});

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app.getHttpServer()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Todos CRUD", () => {
  describe("POST /v1/todos", () => {
    it("creates a todo and returns 201", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/todos")
        .send({ description: "Buy milk" });
      expect(res.status).toBe(201);
      expect(res.body.description).toBe("Buy milk");
      expect(res.body.id).toBeDefined();
    });

    it("accepts a client-provided UUID as id", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const res = await request(app.getHttpServer())
        .post("/v1/todos")
        .send({ id: uuid, description: "Client UUID todo" });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe(uuid);
    });

    it("returns 400 when description is empty", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/todos")
        .send({ description: "" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when description is missing", async () => {
      const res = await request(app.getHttpServer()).post("/v1/todos").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("GET /v1/todos", () => {
    it("returns empty array when no todos exist", async () => {
      const res = await request(app.getHttpServer()).get("/v1/todos");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns all created todos", async () => {
      await request(app.getHttpServer())
        .post("/v1/todos")
        .send({ description: "First" });
      await request(app.getHttpServer())
        .post("/v1/todos")
        .send({ description: "Second" });

      const res = await request(app.getHttpServer()).get("/v1/todos");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe("GET /v1/todos/:id", () => {
    it("returns the todo by id", async () => {
      const created = await request(app.getHttpServer())
        .post("/v1/todos")
        .send({ description: "Find me" });
      const { id } = created.body as { id: string };

      const res = await request(app.getHttpServer()).get(`/v1/todos/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
      expect(res.body.description).toBe("Find me");
    });

    it("returns 404 for a nonexistent id", async () => {
      const res = await request(app.getHttpServer()).get(
        "/v1/todos/00000000-0000-0000-0000-000000000000"
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /v1/todos/:id", () => {
    it("updates the todo and returns 200", async () => {
      const created = await request(app.getHttpServer())
        .post("/v1/todos")
        .send({ description: "Original" });
      const { id } = created.body as { id: string };

      const res = await request(app.getHttpServer())
        .patch(`/v1/todos/${id}`)
        .send({ description: "Updated" });
      expect(res.status).toBe(200);
      expect(res.body.description).toBe("Updated");
    });

    it("returns 404 for a nonexistent id", async () => {
      const res = await request(app.getHttpServer())
        .patch("/v1/todos/00000000-0000-0000-0000-000000000000")
        .send({ description: "Ghost" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /v1/todos/:id", () => {
    it("deletes the todo and returns 204", async () => {
      const created = await request(app.getHttpServer())
        .post("/v1/todos")
        .send({ description: "Delete me" });
      const { id } = created.body as { id: string };

      const res = await request(app.getHttpServer()).delete(`/v1/todos/${id}`);
      expect(res.status).toBe(204);
    });

    it("returns 404 for a nonexistent id", async () => {
      const res = await request(app.getHttpServer()).delete(
        "/v1/todos/00000000-0000-0000-0000-000000000000"
      );
      expect(res.status).toBe(404);
    });

    it("makes the deleted todo unreachable via GET", async () => {
      const created = await request(app.getHttpServer())
        .post("/v1/todos")
        .send({ description: "Gone" });
      const { id } = created.body as { id: string };

      await request(app.getHttpServer()).delete(`/v1/todos/${id}`);

      const res = await request(app.getHttpServer()).get(`/v1/todos/${id}`);
      expect(res.status).toBe(404);
    });
  });
});
