import { User, IUser } from '../../models/User.js';
import { AgentProfile, IAgentProfile } from '../../models/AgentProfile.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { RegisterBody, RegisterAgentBody, LoginBody } from './schemas.js';

export class AuthService {
  static async registerUser(body: RegisterBody): Promise<{ user: IUser }> {
    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) {
      const error: any = new Error('An account with this email address already exists');
      error.statusCode = 409;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }

    const passwordHash = await hashPassword(body.password);
    const user = await User.create({
      name: body.name,
      email: body.email.toLowerCase(),
      phone: body.phone,
      passwordHash,
      role: 'user',
      isEmailVerified: false,
      isBlocked: false,
    });

    return { user };
  }

  static async registerAgent(body: RegisterAgentBody): Promise<{ user: IUser; profile: IAgentProfile }> {
    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) {
      const error: any = new Error('An account with this email address already exists');
      error.statusCode = 409;
      error.code = 'EMAIL_EXISTS';
      throw error;
    }

    const passwordHash = await hashPassword(body.password);
    const user = await User.create({
      name: body.name,
      email: body.email.toLowerCase(),
      phone: body.phone,
      passwordHash,
      role: 'agent',
      isEmailVerified: false,
      isBlocked: false,
    });

    const profile = await AgentProfile.create({
      userId: user._id,
      agencyName: body.agencyName,
      licenseNo: body.licenseNo,
      idProofUrl: body.idProofUrl,
      address: body.address,
      bio: body.bio,
      verificationStatus: 'pending',
    });

    return { user, profile };
  }

  static async login(body: LoginBody): Promise<{ user: IUser; profile?: IAgentProfile | null }> {
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user) {
      // Dummy check to protect against user-enumeration timing attacks
      await hashPassword('dummy_constant_time_comparison');
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (user.isBlocked) {
      const error: any = new Error('Your account has been deactivated. Please contact support.');
      error.statusCode = 403;
      error.code = 'ACCOUNT_BLOCKED';
      throw error;
    }

    const isValid = await verifyPassword(user.passwordHash, body.password);
    if (!isValid) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    let profile: IAgentProfile | null = null;
    if (user.role === 'agent') {
      profile = await AgentProfile.findOne({ userId: user._id });
    }

    return { user, profile };
  }

  static async getMe(userId: string): Promise<{ user: IUser; profile?: IAgentProfile | null }> {
    const user = await User.findById(userId);
    if (!user) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    let profile: IAgentProfile | null = null;
    if (user.role === 'agent') {
      profile = await AgentProfile.findOne({ userId: user._id });
    }

    return { user, profile };
  }
}
