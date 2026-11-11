import { Service } from "fastify-decorators";
import { AppDataSource } from "../../../config/database/database.js";
import { Member } from "../entities/member.entity.js";

@Service()
export class MemberService {
  private get repo() {
    return AppDataSource.getRepository(Member);
  }

  public async findAll(): Promise<Member[]> {
    return await this.repo.find({ order: { name: "ASC" } });
  }

  public async findBySlug(slug: string): Promise<Member | null> {
    return await this.repo.findOneBy({ slug: slug.toLowerCase().trim() });
  }

  public async findById(id: number): Promise<Member | null> {
    return await this.repo.findOneBy({ id });
  }

  public async create(data: Partial<Member>): Promise<Member> {
    const member = new Member();
    member.name = data.name || "";
    member.slug = (data.slug || data.name || "member")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-");
    member.role = data.role || "";
    member.hobby = data.hobby || "";
    member.notes = data.notes || "";
    member.birthdate = data.birthdate || "";
    member.image = data.image || "";
    member.instagram = data.instagram || "";

    return await this.repo.save(member);
  }

  public async update(id: number, data: Partial<Member>): Promise<Member> {
    const member = await this.repo.findOneBy({ id });
    if (!member) throw new Error("Member not found");

    if (data.name !== undefined) member.name = data.name;
    if (data.slug !== undefined) member.slug = data.slug.toLowerCase().trim();
    if (data.role !== undefined) member.role = data.role;
    if (data.hobby !== undefined) member.hobby = data.hobby;
    if (data.notes !== undefined) member.notes = data.notes;
    if (data.birthdate !== undefined) member.birthdate = data.birthdate;
    if (data.image !== undefined && data.image !== "") member.image = data.image;
    if (data.instagram !== undefined) member.instagram = data.instagram;

    return await this.repo.save(member);
  }

  public async delete(id: number): Promise<boolean> {
    const res = await this.repo.delete({ id });
    return (res.affected || 0) > 0;
  }
}
