import {
  NotFoundException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {Args, Mutation, Parent, ResolveField, Resolver} from '@nestjs/graphql';
import {
  CurrentSession,
  CurrentSessionPayload,
} from '../auth/current-session.decorator';
import {GqlAuthnGuard} from '../auth/gql-authn.guard';
import {SpaceEntity} from '../spaces/space.entity';
import {SpacesService} from '../spaces/spaces.service';
import {UserEntity} from '../users/user.entity';
import {UsersService} from '../users/users.service';
import {FollowSpaceArgs} from './dto/follow-space.dto';
import {FollowingEntity} from './following.entity';
import {FollowingService} from './following.service';

@Resolver(() => FollowingEntity)
export class FollowingResolver {
  constructor(
    private readonly spacesService: SpacesService,
    private readonly usersService: UsersService,
    private readonly followingService: FollowingService,
  ) {}

  @ResolveField(() => SpaceEntity)
  space(@Parent() {spaceId}: FollowingEntity) {
    return this.spacesService.findById(spaceId);
  }

  @ResolveField(() => UserEntity)
  user(@Parent() {userId}: FollowingEntity) {
    return this.usersService.findOne({id: userId});
  }

  @Mutation(() => FollowingEntity)
  @UseGuards(GqlAuthnGuard)
  async followSpace(
    @CurrentSession() {user: currentUser}: CurrentSessionPayload,

    @Args({type: () => FollowSpaceArgs}) {spaceId, userId}: FollowSpaceArgs,
  ): Promise<FollowingEntity> {
    if (!currentUser || currentUser.id !== userId)
      throw new UnauthorizedException();

    const isHost = await this.spacesService.isHostUser(spaceId, userId);
    if (isHost === null) throw new NotFoundException();
    if (isHost) throw new UnauthorizedException();

    return this.followingService.upsertFollowing({spaceId, userId});
  }
}
