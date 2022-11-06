import { ApiProperty } from "@nestjs/swagger"

export class PatchOrganizationDto {
    @ApiProperty()
    githubRepo?: string

    @ApiProperty()
    provisioned?: boolean
}