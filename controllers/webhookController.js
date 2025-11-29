import { updateSubscriptionPlan } from '../services/supabaseService.js';

export const handleRevenueCatWebhook = async (req, res) => {
    try {
        const { event } = req.body;
        const authHeader = req.headers.authorization;

        // TODO: Replace with your actual secret verification logic
        // const expectedSecret = `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`;
        // if (authHeader !== expectedSecret) {
        //   return res.status(401).json({ error: 'Unauthorized' });
        // }

        if (!event) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        const { type, app_user_id } = event;
        console.log(`🔔 Received RevenueCat event: ${type} for user: ${app_user_id}`);

        let newPlan = null;

        switch (type) {
            case 'INITIAL_PURCHASE':
            case 'RENEWAL':
            case 'UNCANCELLATION':
                newPlan = 'premium';
                break;
            case 'EXPIRATION':
                newPlan = 'free';
                break;
            case 'CANCELLATION':
                // For cancellation, we might want to keep them as premium until the period ends.
                // RevenueCat sends EXPIRATION when it actually ends.
                // So we might not need to change the plan immediately, but maybe log it.
                console.log(`User ${app_user_id} cancelled. Plan remains active until expiration.`);
                break;
            default:
                console.log(`Unhandled event type: ${type}`);
        }

        if (newPlan) {
            console.log(`🔄 Updating user ${app_user_id} plan to ${newPlan}`);
            await updateSubscriptionPlan(app_user_id, newPlan);
        }

        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
