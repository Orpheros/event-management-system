import { Controller, GET } from "fastify-decorators";

@Controller("/users")
export default class UserController {
  @GET("/")
  async get() {
    return { hello: "world!" };
  }
}
