import debugFactory from './log.util';
import { version } from '../../package';

debugFactory('version')(version);
export default version;
