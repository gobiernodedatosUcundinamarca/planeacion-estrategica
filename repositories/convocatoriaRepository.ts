import 'server-only';
import { getConvocatoriaDataSource } from './datasource';
export function getConvocatoriaDocumental(){return getConvocatoriaDataSource().obtener()}
