import { Service } from "fastify-decorators";
import { AppDataSource } from "../../../config/database/database.js";
import { ChekiPrice } from "../entities/cheki-price.entity.js";
import { generateId } from "../../../utils/id.js";

export interface ChekiSettingsResponse {
  ots: { id: string; price: number };
  po: { id: string; price: number };
}

@Service()
export class SettingService {
  private memoryPrices: Map<string, ChekiPrice> = new Map();

  constructor() {
    this.seedDefaultPrices();
  }

  private seedDefaultPrices() {
    const po = new ChekiPrice();
    po.id = "cheki_price_po0";
    po.type = "po";
    po.price = 35000;
    po.createdAt = new Date();
    po.updatedAt = new Date();

    const ots = new ChekiPrice();
    ots.id = "cheki_price_ots";
    ots.type = "ots";
    ots.price = 40000;
    ots.createdAt = new Date();
    ots.updatedAt = new Date();

    this.memoryPrices.set("po", po);
    this.memoryPrices.set("ots", ots);
  }

  public async getPrices(): Promise<ChekiSettingsResponse> {
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(ChekiPrice);
      const all = await repo.find();
      const poRecord = all.find((p) => p.type.toLowerCase() === "po");
      const otsRecord = all.find((p) => p.type.toLowerCase() === "ots");

      return {
        po: {
          id: poRecord ? poRecord.id : "cheki_price_po0",
          price: poRecord ? poRecord.price : 35000,
        },
        ots: {
          id: otsRecord ? otsRecord.id : "cheki_price_ots",
          price: otsRecord ? otsRecord.price : 40000,
        },
      };
    }

    const po = this.memoryPrices.get("po");
    const ots = this.memoryPrices.get("ots");

    return {
      po: { id: po ? po.id : "cheki_price_po0", price: po ? po.price : 35000 },
      ots: { id: ots ? ots.id : "cheki_price_ots", price: ots ? ots.price : 40000 },
    };
  }

  public async updatePrices(body: {
    po?: number | { price?: number };
    ots?: number | { price?: number };
    type?: "po" | "ots";
    price?: number;
  }): Promise<ChekiSettingsResponse> {
    let poVal: number | undefined;
    let otsVal: number | undefined;

    if (body.type && body.price !== undefined) {
      if (body.type === "po") poVal = Number(body.price);
      if (body.type === "ots") otsVal = Number(body.price);
    }

    if (typeof body.po === "number") poVal = body.po;
    else if (body.po && typeof body.po.price === "number") poVal = body.po.price;

    if (typeof body.ots === "number") otsVal = body.ots;
    else if (body.ots && typeof body.ots.price === "number") otsVal = body.ots.price;

    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(ChekiPrice);

      if (poVal !== undefined) {
        let p = await repo.findOneBy({ type: "po" });
        if (!p) {
          p = new ChekiPrice();
          p.id = generateId();
          p.type = "po";
        }
        p.price = poVal;
        await repo.save(p);
      }

      if (otsVal !== undefined) {
        let o = await repo.findOneBy({ type: "ots" });
        if (!o) {
          o = new ChekiPrice();
          o.id = generateId();
          o.type = "ots";
        }
        o.price = otsVal;
        await repo.save(o);
      }
    } else {
      if (poVal !== undefined) {
        const p = this.memoryPrices.get("po") || new ChekiPrice();
        p.id = p.id || generateId();
        p.type = "po";
        p.price = poVal;
        p.updatedAt = new Date();
        this.memoryPrices.set("po", p);
      }

      if (otsVal !== undefined) {
        const o = this.memoryPrices.get("ots") || new ChekiPrice();
        o.id = o.id || generateId();
        o.type = "ots";
        o.price = otsVal;
        o.updatedAt = new Date();
        this.memoryPrices.set("ots", o);
      }
    }

    return await this.getPrices();
  }
}
