import { x as sql } from './index2-B7hVh_Qf.js';

function count(expression) {
  return sql`count(${sql.raw("*")})`.mapWith(Number);
}

export { count as c };
//# sourceMappingURL=aggregate-CrXc04Dg.js.map
