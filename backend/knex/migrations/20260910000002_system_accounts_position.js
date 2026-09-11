exports.up = async function (knex) {
  await knex.schema.alterTable('system_accounts', (t) => {
    t.integer('position');
  });

  const rows = await knex('system_accounts').orderBy('system').select('id');
  for (let i = 0; i < rows.length; i++) {
    await knex('system_accounts').where({ id: rows[i].id }).update({ position: (i + 1) * 1000 });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable('system_accounts', (t) => {
    t.dropColumn('position');
  });
};
