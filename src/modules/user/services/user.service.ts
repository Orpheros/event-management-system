import { Service } from "fastify-decorators";

@Service()
export class UserService {
  public getUsers() {
    return [{ id: 1, name: "Sam" }];
  }
}
