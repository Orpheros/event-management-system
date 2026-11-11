import { Controller, GET, POST, PUT, DELETE, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { MemberService } from "../services/member.service.js";
import { saveUploadedFile } from "../../../utils/upload.js";

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

  @GET("/:slug")
  async getBySlug(request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) {
    const member = await this.memberService.findBySlug(request.params.slug);
    if (!member) {
      return reply.status(404).send({ error: "Member not found" });
    }
    return member.toJSON();
  }

  @POST("/")
  async createMember(request: FastifyRequest, reply: FastifyReply) {
    let fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let fileName = "";

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          const buffer = await part.toBuffer();
          if (buffer.length > 0) {
            fileBuffer = buffer;
            fileName = part.filename;
          }
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }
    } else {
      fields = (request.body as Record<string, string>) || {};
      fileName = fields.image || "";
    }

    const created = await this.memberService.create({
      name: fields.name,
      slug: fields.slug,
      role: fields.role,
      hobby: fields.hobby,
      notes: fields.notes,
      birthdate: fields.birthdate,
      instagram: fields.instagram,
      image: fileBuffer ? "" : fileName,
    });

    // Save the upload under the generated numeric id, then persist the filename
    if (fileBuffer) {
      const savedFilename = await saveUploadedFile("members", String(created.id), fileName, fileBuffer);
      const updated = await this.memberService.update(created.id, { image: savedFilename });
      return updated.toJSON();
    }

    return created.toJSON();
  }

  @PUT("/")
  async updateMember(request: FastifyRequest, reply: FastifyReply) {
    let fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let fileName = "";

    if (request.isMultipart()) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          const buffer = await part.toBuffer();
          if (buffer.length > 0) {
            fileBuffer = buffer;
            fileName = part.filename;
          }
        } else {
          fields[part.fieldname] = part.value as string;
        }
      }
    } else {
      fields = (request.body as Record<string, string>) || {};
      fileName = fields.image || "";
    }

    const id = Number(fields.id);
    if (!fields.id) {
      return reply.status(400).send({ error: "Member id is required" });
    }

    let savedFilename = fileBuffer ? "" : fileName;
    if (fileBuffer) {
      savedFilename = await saveUploadedFile("members", String(id), fileName, fileBuffer);
    }

    const { id: _id, ...rest } = fields;
    const updatePayload: Record<string, string> = { ...rest };
    if (savedFilename) {
      updatePayload.image = savedFilename;
    }

    const updated = await this.memberService.update(id, updatePayload);
    return updated.toJSON();
  }

  @DELETE("/")
  async deleteMember(request: FastifyRequest<{ Querystring: DeleteQuery }>, reply: FastifyReply) {
    const id = request.query.id;
    if (!id) {
      return reply.status(400).send({ error: "Member id query parameter is required" });
    }
    await this.memberService.delete(Number(id));
    return { success: true, id };
  }
}
