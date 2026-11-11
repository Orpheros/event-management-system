import { Service } from "fastify-decorators";
import { AppDataSource } from "../../../config/database/database.js";
import { ChekiPrice } from "../entities/cheki-price.entity.js";

export interface ChekiSettingsResponse {
  ots: { id: number; price: number };
  po: { id: number; price: number };
}

@Service()
export class SettingService {
  private get repo() {
    return AppDataSource.getRepository(ChekiPrice);
  }

  public async getPrices(): Promise<ChekiSettingsResponse> {
    const all = await this.repo.find();
    const poRecord = all.find((p) => p.type.toLowerCase() === "po");
    const otsRecord = all.find((p) => p.type.toLowerCase() === "ots");

    return {
      po: {
        id: poRecord ? poRecord.id : 1,
        price: poRecord ? poRecord.price : 35000,
      },
      ots: {
        id: otsRecord ? otsRecord.id : 2,
        price: otsRecord ? otsRecord.price : 40000,
      },
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

    if (poVal !== undefined) {
      let p = await this.repo.findOneBy({ type: "po" });
      if (!p) {
        p = new ChekiPrice();
        p.type = "po";
      }
      p.price = poVal;
      await this.repo.save(p);
    }

    if (otsVal !== undefined) {
      let o = await this.repo.findOneBy({ type: "ots" });
      if (!o) {
        o = new ChekiPrice();
        o.type = "ots";
      }
      o.price = otsVal;
      await this.repo.save(o);
    }

    return await this.getPrices();
  }
}
