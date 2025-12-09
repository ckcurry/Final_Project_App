import { Amplify } from 'aws-amplify';
import { loadAmplifyConfig } from '@aws-amplify/react-native';
import outputs from './amplify_outputs.json';

loadAmplifyConfig();
Amplify.configure(outputs);

export default Amplify;
