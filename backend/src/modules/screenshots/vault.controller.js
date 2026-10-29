import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../../models/user.js';

export async function unlockVault(req, res) {
    try {
        const { password } = req.body;

        if (
            typeof password !== 'string' ||
            password.length === 0 ||
            password.length > 200
        ) {
            return res.status(400).json({
                success: false,
                message: 'A valid password is required.',
            });
        }

        const user = await User.findById(req.userId).select('+passwordHash');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
        }

        if (!user.passwordHash || user.authProvider?.provider !== 'local') {
            return res.status(400).json({
                success: false,
                message: 'Vault unlock requires a local account password.',
            });
        }

        const passwordMatches = await user.comparePassword(password);

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password.',
            });
        }

        const vaultToken = jwt.sign(
            {
                sub: user._id.toString(),
                purpose: 'vault-access',
            },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        return res.status(200).json({
            success: true,
            vaultToken,
            expiresIn: 900,
        });
    } catch (error) {
        console.error('Vault unlock error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to unlock Vault.',
        });
    }
}