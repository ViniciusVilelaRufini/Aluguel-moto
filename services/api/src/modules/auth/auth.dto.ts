import { ArrayUnique, IsArray, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { STAFF_GROUPS, type StaffGroup } from '../../common/enums';

const PHONE = /^\+[1-9]\d{7,14}$/;

export class DevTokenRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  sub: string;

  @IsEmail()
  email: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(STAFF_GROUPS, { each: true })
  groups: StaffGroup[];

  @IsIn(['customer', 'staff'])
  pool: 'customer' | 'staff';
}

export class MeUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Matches(PHONE)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @Matches(PHONE)
  emergencyContactPhone?: string;
}

export class DeviceRegistrationDto {
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  fcmToken: string;

  @IsIn(['android', 'ios', 'web'])
  platform: 'android' | 'ios' | 'web';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}
