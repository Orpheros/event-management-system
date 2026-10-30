import { Controller, GET, PUT, Inject } from "fastify-decorators";
import type { FastifyRequest, FastifyReply } from "fastify";
import { SettingService } from "../services/setting.service.js";

@Controller("/admin/settings")
export default class SettingController {
  @Inject(SettingService)
  private settingService!: SettingService;

  @GET("/")
  async getSettings(request: FastifyRequest, reply: FastifyReply) {
    return await this.settingService.getPrices();
  }

  @PUT("/")
  async updateSettings(
    request: FastifyRequest<{
      Body: {
        po?: number | { price?: number };
        ots?: number | { price?: number };
        type?: "po" | "ots";
        price?: number;
      };
    }>,
    reply: FastifyReply
  ) {
    return await this.settingService.updatePrices(request.body || {});
  }
}
