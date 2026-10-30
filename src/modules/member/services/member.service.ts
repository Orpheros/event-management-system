import { Service } from "fastify-decorators";
import { AppDataSource } from "../../../config/database/database.js";
import { Member } from "../entities/member.entity.js";
import { generateId } from "../../../utils/id.js";

@Service()
export class MemberService {
  private memoryMembers: Map<string, Member> = new Map();

  constructor() {
    this.seedDefaultMemoryMembers();
  }

  private seedDefaultMemoryMembers() {
    const defaultMembers: Array<Partial<Member>> = [
      {
        id: "l17syk3g4nslfkb",
        slug: "maricel",
        name: "Maricel",
        role: "Lead Vocalist",
        hobby: "Singing, Reading",
        notes: "Center member of Stellar Luna",
        birthdate: "2004-03-15",
        image: "maricel.jpg",
        instagram: "https://instagram.com/maricel",
      },
      {
        id: "m88tyk3g4nslfa1",
        slug: "rakun",
        name: "Rakun",
        role: "Main Dancer",
        hobby: "Dancing, Gaming",
        notes: "Energetic dancer",
        birthdate: "2005-07-20",
        image: "rakun.jpg",
        instagram: "https://instagram.com/rakun",
      },
      {
        id: "y99tyk3g4nslfb2",
        slug: "yenna",
        name: "Yenna",
        role: "Visual & Vocalist",
        hobby: "Cooking, Photography",
        notes: "Charming visual",
        birthdate: "2004-11-02",
        image: "yenna.jpg",
        instagram: "https://instagram.com/yenna",
      },
    ];

    for (const m of defaultMembers) {
      const member = new Member();
      Object.assign(member, m);
      member.createdAt = new Date();
      member.updatedAt = new Date();
      this.memoryMembers.set(member.id, member);
    }
  }

  public async findAll(): Promise<Member[]> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Member);
      return await repo.find({ order: { name: "ASC" } });
    }
    return Array.from(this.memoryMembers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  public async findBySlug(slug: string): Promise<Member | null> {
    const cleanSlug = slug.toLowerCase().trim();
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Member);
      return await repo.findOneBy({ slug: cleanSlug });
    }
    for (const m of this.memoryMembers.values()) {
      if (m.slug.toLowerCase() === cleanSlug) {
        return m;
      }
    }
    return null;
  }

  public async findById(id: string): Promise<Member | null> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Member);
      return await repo.findOneBy({ id });
    }
    return this.memoryMembers.get(id) || null;
  }

  public async create(data: Partial<Member>): Promise<Member> {
    const member = new Member();
    member.id = data.id || generateId();
    member.name = data.name || "";
    member.slug = (data.slug || data.name || generateId())
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
    member.createdAt = new Date();
    member.updatedAt = new Date();

    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Member);
      return await repo.save(member);
    }
    this.memoryMembers.set(member.id, member);
    return member;
  }

  public async update(id: string, data: Partial<Member>): Promise<Member> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Member);
      const member = await repo.findOneBy({ id });
      if (!member) throw new Error("Member not found");

      if (data.name !== undefined) member.name = data.name;
      if (data.slug !== undefined) member.slug = data.slug.toLowerCase().trim();
      if (data.role !== undefined) member.role = data.role;
      if (data.hobby !== undefined) member.hobby = data.hobby;
      if (data.notes !== undefined) member.notes = data.notes;
      if (data.birthdate !== undefined) member.birthdate = data.birthdate;
      if (data.image !== undefined && data.image !== "") member.image = data.image;
      if (data.instagram !== undefined) member.instagram = data.instagram;
      member.updatedAt = new Date();

      return await repo.save(member);
    }

    const member = this.memoryMembers.get(id);
    if (!member) throw new Error("Member not found");

    if (data.name !== undefined) member.name = data.name;
    if (data.slug !== undefined) member.slug = data.slug.toLowerCase().trim();
    if (data.role !== undefined) member.role = data.role;
    if (data.hobby !== undefined) member.hobby = data.hobby;
    if (data.notes !== undefined) member.notes = data.notes;
    if (data.birthdate !== undefined) member.birthdate = data.birthdate;
    if (data.image !== undefined && data.image !== "") member.image = data.image;
    if (data.instagram !== undefined) member.instagram = data.instagram;
    member.updatedAt = new Date();

    this.memoryMembers.set(id, member);
    return member;
  }

  public async delete(id: string): Promise<boolean> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(Member);
      const res = await repo.delete({ id });
      return (res.affected || 0) > 0;
    }
    return this.memoryMembers.delete(id);
  }
}
