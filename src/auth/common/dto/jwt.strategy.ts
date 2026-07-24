// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { User } from '../entity/user';
// import { ConfigService } from '@nestjs/config';
// import { Repository } from 'typeorm';
// import { JwtPayload } from '../jwt-payload.interface';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { PassportStrategy } from '@nestjs/passport';
// import { ErrorCode } from '../../../../utils/common.enum';
// import { userKey } from '../../../redis/redis.keys';
// import { RedisCacheService } from '../../../redis/redis-cach.service';

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   constructor(
//     @InjectRepository(User, 'main_repo')
//     private userRepository: Repository<User>,
//     private readonly redis: RedisCacheService,
//     configService: ConfigService,
//   ) {
//     super({
//       secretOrKey: configService.get<string>('JWT_SECRET')!,
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//     });
//   }

//   async validate(payload: JwtPayload): Promise<User> {
//     const casheKey = userKey(payload.id);
//     const cached = await this.redis.get<JwtPayload>(casheKey);

//     if (cached) {
//       return JSON.parse(cached);
//     }
//     const { username } = payload;

//     const user = await this.userRepository.findOne({
//       where: { username },
//     });

//     if (!user) {
//       throw new UnauthorizedException({
//         code: ErrorCode.FORBIDDEN_ROLE,
//       });
//     }

//     return user;
//   }
// }
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entity/user';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { JwtPayload } from '../jwt-payload.interface';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ErrorCode } from '../../../../utils/common.enum';
import { userKey } from '../../../redis/redis.keys';
import { RedisCacheService } from '../../../redis/redis-cach.service';
import { USER_PROFILE_TTL } from '../../../redis/redis.ttl';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User, 'main_repo')
    private userRepository: Repository<User>,
    private readonly redis: RedisCacheService,
    configService: ConfigService,
  ) {
    super({
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const cacheKey = userKey(payload.id);

    const cached = await this.redis.get<User>(cacheKey);
    if (cached) {
      return cached; // already an object — no JSON.parse needed if redis.get deserializes internally
    }

    const { username } = payload;

    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.FORBIDDEN_ROLE,
      });
    }

    // populate the cache so the NEXT request is a hit, not another DB round-trip
    await this.redis.set(cacheKey, user, USER_PROFILE_TTL);

    return user;
  }
}
