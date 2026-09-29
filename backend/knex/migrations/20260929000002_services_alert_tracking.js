exports.up = async function (knex) {
  await knex.schema.alterTable('services', (t) => {
    t.date('alerted_expiration_date'); // expiration_date value the last Teams alert was sent for
    t.timestamp('last_alert_sent_at');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('services', (t) => {
    t.dropColumn('alerted_expiration_date');
    t.dropColumn('last_alert_sent_at');
  });
};
