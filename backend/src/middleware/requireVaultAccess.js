import jwt from 'jsonwebtoken';

export default function requireVaultAccess(req, res, next) {
    const token = req.headers['x-vault-token'];

    if (!token) {
        return res.status(403).json({
            success: false,
            message: 'Unlock Vault to continue.',
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (
            payload.purpose !== 'vault-access' ||
            payload.sub !== String(req.userId)
        ) {
            return res.status(403).json({
                success: false,
                message: 'Invalid Vault access.',
            });
        }

        req.vaultUnlocked = true;
        next();
    } catch {
        return res.status(403).json({
            success: false,
            message: 'Vault access expired. Unlock it again.',
        });
    }
}