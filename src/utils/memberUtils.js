/**
 * Utilitários para classificação de membros da igreja.
 *
 * Tipos de membros:
 * - MI (Membro de Igreja): pessoa batizada E com o curso de Aliança/Membresia concluído no trilho.
 *   Verificação: milestones.baptism (concluído) E milestones.membership (concluído)
 * - MC (Membro de Connect): qualquer membro cadastrado que não seja MI.
 */

/**
 * Verifica se um marco específico está concluído.
 * Aceita completed=true explícito OU data preenchida (compatibilidade retroativa).
 *
 * @param {object|undefined} milestone - Objeto do marco { completed, date }
 * @returns {boolean}
 */
export const isMilestoneCompleted = (milestone) => {
    if (!milestone) return false;
    return Boolean(milestone.completed) ||
           Boolean(milestone.date && milestone.date !== null && milestone.date !== '');
};

/**
 * Verifica se o membro tem batismo concluído.
 */
export const hasBaptismCompleted = (member) => {
    if (!member) return false;
    const milestones = member.milestones || {};
    return isMilestoneCompleted(milestones.baptism);
};

/**
 * Verifica se o membro tem Aliança de Membresia / Membresia concluída.
 * Checa o marco no trilho e cursos concluídos como suporte.
 */
export const hasMembershipCompleted = (member) => {
    if (!member) return false;
    const milestones = member.milestones || {};
    if (isMilestoneCompleted(milestones.membership)) return true;

    // Fallback: verificar se possui curso concluído relacionado à Aliança de Membresia
    if (Array.isArray(member.completedCourses) && member.completedCourses.length > 0) {
        return member.completedCourses.some(c => {
            const name = (c?.name || c?.courseName || '').toLowerCase();
            return name.includes('aliança') || name.includes('alianca') || name.includes('membresia');
        });
    }

    return false;
};

/**
 * Retorna o tipo de membro: 'MI' ou 'MC'.
 *
 * MI (Membro de Igreja): tem Batismo E Membresia concluídos no trilho de liderança.
 * MC (Membro de Connect): qualquer outra pessoa cadastrada.
 *
 * @param {object} member - Objeto do membro com campo milestones
 * @returns {'MI'|'MC'}
 */
export const getMembershipType = (member) => {
    if (!member) return 'MC';
    const hasBaptism = hasBaptismCompleted(member);
    const hasMembership = hasMembershipCompleted(member);
    return hasBaptism && hasMembership ? 'MI' : 'MC';
};

/**
 * Retorna os metadados visuais do tipo de membro para exibição em badges.
 * Paleta neutra (preto / cinza escuro para MI e branco / cinza claro para MC), sem cores chamativas.
 *
 * @param {'MI'|'MC'} type
 * @returns {{ label: string, name: string, color: string, bg: string, border: string, title: string }}
 */
export const getMembershipTypeBadge = (type) => {
    if (type === 'MI') {
        return {
            label: 'MI',
            name: 'Membro de Igreja',
            title: 'Membro de Igreja — Batizado e com Aliança de Membresia',
            color: 'text-white',
            bg: 'bg-gray-700',
            border: 'border-gray-700',
        };
    }
    return {
        label: 'MC',
        name: 'Membro de Connect',
        title: 'Membro de Connect',
        color: 'text-gray-700',
        bg: 'bg-white',
        border: 'border-gray-300',
    };
};

