import { TextoEditorial } from '@/components/editorial/texto-editorial';
import { formato, porcentaje, type DatosNarrativos } from './modelo';

export function ComparacionRoles({roles,compacta=false}:{roles:DatosNarrativos['comparacionRoles'];compacta?:boolean}) {
  return <div className={`comparacion-roles ${compacta ? 'comparacion-roles-compacta' : ''}`}>
    <h3><TextoEditorial id="participacion-comparacion-roles" original="Convocados y asistentes por rol"/></h3>
    <div className="tabla-scroll" role="region" tabIndex={0} aria-label="Convocados y asistentes por rol">
      <table>
        <caption><TextoEditorial id="participacion-formula-roles" original="% de asistencia: asistentes del rol ÷ convocados del mismo rol × 100."/></caption>
        <thead><tr>
          <th scope="col"><TextoEditorial id="f9940728b543cca2165d" original="Rol"/></th>
          <th scope="col"><TextoEditorial id="595faa158cb0bd052852" original="Convocados"/></th>
          <th scope="col"><TextoEditorial id="d80c1b1ff240ccafc8d6" original="Asistentes"/></th>
          <th scope="col"><TextoEditorial id="53676d61f67d12550267" original="% de asistencia"/></th>
        </tr></thead>
        <tbody>{roles.map(rol => <tr key={rol.nombre}>
          <th scope="row">{rol.nombre}</th>
          <td>{rol.convocados === null ? '—' : formato(rol.convocados)}</td>
          <td>{formato(rol.asistentes)}</td>
          <td>{rol.porcentajeAsistencia === null ? '—' : `${porcentaje(rol.asistentes,rol.convocados!)} %`}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="nota-evidencia"><TextoEditorial id="participacion-nota-administrativos" original="Administrativos reúne planta y trabajadores, como en la convocatoria. Un porcentaje superior al 100 % indica más asistencias registradas que personas convocadas. — indica que no hay un denominador disponible."/></p>
  </div>;
}
