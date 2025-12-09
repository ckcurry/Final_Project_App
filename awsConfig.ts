import { Amplify } from 'aws-amplify';
import outputs from './amplify_outputs.json';

// Configure Amplify once on app start
Amplify.configure(outputs);

export default Amplify;
