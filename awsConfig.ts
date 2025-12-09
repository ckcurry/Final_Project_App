import { Amplify } from 'aws-amplify';
import outputs from './amplify_outputs.json';

// Configure Amplify once on app startup so Auth calls have the necessary endpoints.
Amplify.configure(outputs);

export default Amplify;
