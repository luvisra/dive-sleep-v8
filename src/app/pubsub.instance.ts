// Amplify v6 PubSub singleton instance
import { PubSub as PubSubClass } from '@aws-amplify/pubsub';

// Create a singleton instance
export const PubSub = new PubSubClass();
