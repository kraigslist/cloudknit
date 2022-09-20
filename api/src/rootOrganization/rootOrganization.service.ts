import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Organization, User } from "src/typeorm";
import { CreateOrganizationDto } from "./rootOrganization.dto";
import { UsersService } from "src/users/users.service";

@Injectable()
export class RootOrganizationsService {
  private readonly logger = new Logger(RootOrganizationsService.name);

  constructor(
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly usersService: UsersService
  ) {}

  async getOrganizations() {
    return this.orgRepo.find();
  }

  async create(newOrg: CreateOrganizationDto) {
    let user;

    if (newOrg.termsAgreedUserId) {
      user = await this.usersService.getUserById(newOrg.termsAgreedUserId);

      if (!user) {
        throw new BadRequestException('could not find user');
      }
    }

    const org = await this.orgRepo.save({
      name: newOrg.name,
      githubRepo: newOrg.githubRepo,
      termsAgreedUserId: user ? user.id : null
    });

    this.logger.log('created organization', { user, org })

    if (user) {
      user.organizations = [ ...user.organizations, org ];
      user = await this.userRepo.save(user);
    }

    return org;
  }
}
