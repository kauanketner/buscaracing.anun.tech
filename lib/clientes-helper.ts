/**
 * Helpers para vincular automaticamente snapshots de cliente à tabela `clientes`.
 *
 * Usado em endpoints onde o usuário não pode "escolher" um cliente do banco
 * (ex: aluguel via site público, leads inbound). Faz match por
 * (nome normalizado + dígitos do telefone). Se achar, retorna o id; se não,
 * cria um cliente novo e retorna o id criado.
 */
import type Database from 'better-sqlite3';

export type SnapshotCliente = {
  nome: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
  endereco?: string;
};

/**
 * Encontra ou cria um cliente baseado no snapshot. Retorna o id.
 * Atualiza dados vazios do cliente existente (ex: completa CPF se não tinha).
 */
export function upsertClientePorSnapshot(
  db: Database.Database,
  snap: SnapshotCliente,
): number | null {
  const nome = (snap.nome || '').trim();
  if (!nome) return null;

  const tel = (snap.telefone || '').trim();
  const telDigits = tel.replace(/\D/g, '');
  const nomeNorm = nome.toLowerCase().replace(/\s+/g, ' ');

  // Tenta achar cliente existente: por nome normalizado + telefone (dígitos)
  // Estratégia: pega todos com mesmo nome (case-insensitive) e compara telefone.
  // Pra casos sem telefone, agrupa só por nome (heurística, pode dar falso positivo
  // mas é melhor que duplicar — admin pode editar depois).
  let clienteId: number | null = null;

  if (telDigits.length > 0) {
    const candidatos = db
      .prepare(
        `SELECT id, telefone FROM clientes
         WHERE LOWER(TRIM(REPLACE(nome, '  ', ' '))) = ?
         AND ativo = 1`,
      )
      .all(nomeNorm) as { id: number; telefone: string }[];
    for (const c of candidatos) {
      const cTel = (c.telefone || '').replace(/\D/g, '');
      if (cTel === telDigits) {
        clienteId = c.id;
        break;
      }
    }
  } else {
    // Sem telefone: tenta achar por nome único
    const semTel = db
      .prepare(
        `SELECT id FROM clientes
         WHERE LOWER(TRIM(REPLACE(nome, '  ', ' '))) = ?
         AND ativo = 1`,
      )
      .all(nomeNorm) as { id: number }[];
    if (semTel.length === 1) clienteId = semTel[0].id;
  }

  if (clienteId != null) {
    // Atualiza campos vazios com os dados do snapshot (se preenchidos)
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (snap.email) { sets.push("email = CASE WHEN COALESCE(email,'') = '' THEN ? ELSE email END"); vals.push(snap.email); }
    if (snap.cpf_cnpj) { sets.push("cpf_cnpj = CASE WHEN COALESCE(cpf_cnpj,'') = '' THEN ? ELSE cpf_cnpj END"); vals.push(snap.cpf_cnpj); }
    if (snap.endereco) { sets.push("endereco = CASE WHEN COALESCE(endereco,'') = '' THEN ? ELSE endereco END"); vals.push(snap.endereco); }
    if (sets.length > 0) {
      sets.push("updated_at = datetime('now','localtime')");
      vals.push(clienteId);
      try {
        db.prepare(`UPDATE clientes SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
      } catch { /* silencioso — best effort */ }
    }
    return clienteId;
  }

  // Cria cliente novo
  try {
    const result = db
      .prepare(
        `INSERT INTO clientes (nome, telefone, email, cpf_cnpj, endereco)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        nome,
        tel,
        (snap.email || '').trim(),
        (snap.cpf_cnpj || '').trim(),
        (snap.endereco || '').trim(),
      );
    return Number(result.lastInsertRowid);
  } catch {
    return null;
  }
}
