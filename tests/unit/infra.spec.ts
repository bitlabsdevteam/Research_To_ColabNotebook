import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import yaml from "yaml";

const infraDir = path.join(__dirname, "../../infra");
const mainTf = path.join(infraDir, "main.tf");
const variablesTf = path.join(infraDir, "variables.tf");
const outputsTf = path.join(infraDir, "outputs.tf");
const cdYml = path.join(__dirname, "../../.github/workflows/cd.yml");

describe("Terraform config (infra/)", () => {
  it("main.tf exists", () => {
    expect(fs.existsSync(mainTf)).toBe(true);
  });

  it("variables.tf exists", () => {
    expect(fs.existsSync(variablesTf)).toBe(true);
  });

  it("outputs.tf exists", () => {
    expect(fs.existsSync(outputsTf)).toBe(true);
  });

  it("main.tf has S3 backend for remote state", () => {
    const content = fs.readFileSync(mainTf, "utf-8");
    expect(content).toContain('backend "s3"');
  });

  it("main.tf defines VPC", () => {
    const content = fs.readFileSync(mainTf, "utf-8");
    expect(content).toContain("aws_vpc");
  });

  it("main.tf defines ECS cluster", () => {
    const content = fs.readFileSync(mainTf, "utf-8");
    expect(content).toContain("aws_ecs_cluster");
  });

  it("main.tf defines ECR repositories", () => {
    const content = fs.readFileSync(mainTf, "utf-8");
    expect(content).toContain("aws_ecr_repository");
  });

  it("main.tf defines ECS task definitions", () => {
    const content = fs.readFileSync(mainTf, "utf-8");
    expect(content).toContain("aws_ecs_task_definition");
  });

  it("main.tf defines ECS services with Fargate", () => {
    const content = fs.readFileSync(mainTf, "utf-8");
    expect(content).toContain("aws_ecs_service");
    expect(content).toContain("FARGATE");
  });

  it("main.tf defines ALB", () => {
    const content = fs.readFileSync(mainTf, "utf-8");
    expect(content).toContain("aws_lb");
  });

  it("main.tf defines security groups", () => {
    const content = fs.readFileSync(mainTf, "utf-8");
    expect(content).toContain("aws_security_group");
  });

  it("variables.tf has region variable", () => {
    const content = fs.readFileSync(variablesTf, "utf-8");
    expect(content).toContain("region");
  });

  it("outputs.tf has ALB DNS output", () => {
    const content = fs.readFileSync(outputsTf, "utf-8");
    expect(content).toMatch(/alb.*dns|load_balancer.*url/i);
  });
});

describe("CD workflow (.github/workflows/cd.yml)", () => {
  it("exists and is valid YAML", () => {
    expect(fs.existsSync(cdYml)).toBe(true);
    const raw = fs.readFileSync(cdYml, "utf-8");
    const config = yaml.parse(raw);
    expect(config).toBeDefined();
  });

  it("triggers on push to main", () => {
    const raw = fs.readFileSync(cdYml, "utf-8");
    const config = yaml.parse(raw);
    expect(config.on.push.branches).toContain("main");
  });

  it("builds and pushes Docker images to ECR", () => {
    const raw = fs.readFileSync(cdYml, "utf-8");
    expect(raw).toContain("docker");
    expect(raw).toMatch(/ecr|ECR/);
  });

  it("uses AWS credentials from GitHub Secrets", () => {
    const raw = fs.readFileSync(cdYml, "utf-8");
    expect(raw).toContain("AWS_ACCESS_KEY_ID");
    expect(raw).toContain("AWS_SECRET_ACCESS_KEY");
    expect(raw).toContain("AWS_REGION");
  });

  it("does NOT contain hardcoded AWS credentials", () => {
    const raw = fs.readFileSync(cdYml, "utf-8");
    expect(raw).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(raw).not.toMatch(/[0-9a-zA-Z/+]{40}/);
  });
});
