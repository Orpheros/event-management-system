import { Controller, GET, POST, PUT, DELETE, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { MemberService } from "../services/member.service.js";
import { saveUploadedFile } from "../../../utils/upload.js";
import { generateId } from "../../../utils/id.js";

interface DeleteQuery {
  id?: string;
}

@Controller("/members")
export default class MemberController {
  @Inject(MemberService)
  private memberService!: MemberService;

  @GET("/")
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const members = await this.memberService.findAll();
    return members.map((m) => m.toJSON());
  }

  @GET("/raw")
  async getRaw(request: FastifyRequest, reply: FastifyReply) {
    const members = await this.memberService.findAll();
    return members.map((m) => m.toJSON());
  }

  @GET("/:slug")
  async getBySlug(request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) {
    const member = await this.memberService.findBySlug(request.params.slug);
    if (!member) {
      return reply.status(404).send({ error: "Member not found" });
    }
    return member.toJSON();
  }

  @POST("/raw")
  async createMember(request: FastifyRequest, reply: FastifyReply) {
    const recordId = generateId();
    let fields: Record<string, string> = {};
    let savedFilename = "";

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          const buffer = await part.toBuffer();
          if (buffer.length > 0) {
            savedFilename = await saveUploadedFile("members", recordId, part.filename, buffer);
          }
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }
    } else {
      fields = (request.body as Record<string, string>) || {};
      savedFilename = fields.image || "";
    }

    const created = await this.memberService.create({
      id: recordId,
      name: fields.name,
      slug: fields.slug,
      role: fields.role,
      hobby: fields.hobby,
      notes: fields.notes,
      birthdate: fields.birthdate,
      instagram: fields.instagram,
      image: savedFilename,
    });

    return created.toJSON();
  }

  @PUT("/raw")
  async updateMember(request: FastifyRequest, reply: FastifyReply) {
    let fields: Record<string, string> = {};
    let savedFilename = "";

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          const buffer = await part.toBuffer();
          if (buffer.length > 0) {
            const targetId = fields.id || generateId();
            savedFilename = await saveUploadedFile("members", targetId, part.filename, buffer);
          }
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }
    } else {
      fields = (request.body as Record<string, string>) || {};
      savedFilename = fields.image || "";
    }

    const id = fields.id;
    if (!id) {
      return reply.status(400).send({ error: "Member id is required" });
    }

    const updatePayload: Record<string, string> = { ...fields };
    if (savedFilename) {
      updatePayload.image = savedFilename;
    }

    const updated = await this.memberService.update(id, updatePayload);
    return updated.toJSON();
  }

  @DELETE("/raw")
  async deleteMember(request: FastifyRequest<{ Querystring: DeleteQuery }>, reply: FastifyReply) {
    const id = request.query.id;
    if (!id) {
      return reply.status(400).send({ error: "Member id query parameter is required" });
    }
    await this.memberService.delete(id);
    return { success: true, id };
  }
}
