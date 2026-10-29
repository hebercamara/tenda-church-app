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
 * Definição dos marcos do Trilho de Liderança.
 */
export const leadershipMilestones = [
    { id: 'salvation', label: '1. Aceitou a Jesus', shortLabel: 'Aceitou Jesus' },
    { id: 'initialDiscipleship', label: '2. Discipulado Inicial', shortLabel: 'Discipulado' },
    { id: 'baptism', label: '3. Batismo', shortLabel: 'Batismo' },
    { id: 'membership', label: '4. Aliança de Membresia', shortLabel: 'Membresia' },
    { id: 'connectTraining', label: '5. Treinamento no Connect', shortLabel: 'Treinamento' },
    { id: 'connectLeader', label: '6. Líder de Connect', shortLabel: 'Líder Connect' },
];

/**
 * Retorna o rótulo legível de um marco.
 */
export const getMilestoneLabel = (milestoneId) => {
    const found = leadershipMilestones.find(m => m.id === milestoneId);
    return found ? found.label : milestoneId;
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
 * Checa o marco no trilho, templates de cursos vinculados e cursos concluídos como suporte.
 */
export const hasMembershipCompleted = (member, courseTemplates = []) => {
    if (!member) return false;
    const milestones = member.milestones || {};
    if (isMilestoneCompleted(milestones.membership)) return true;

    // Verificar se possui curso concluído relacionado à Aliança de Membresia
    if (Array.isArray(member.completedCourses) && member.completedCourses.length > 0) {
        return member.completedCourses.some(c => {
            // Verificar pelo templateId vinculado ao milestone 'membership'
            if (c.templateId && Array.isArray(courseTemplates)) {
                const tmpl = courseTemplates.find(t => t.id === c.templateId);
                if (tmpl && tmpl.linkedMilestoneId === 'membership') return true;
            }
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
 * @param {Array} [courseTemplates] - Lista opcional de modelos de cursos
 * @returns {'MI'|'MC'}
 */
export const getMembershipType = (member, courseTemplates = []) => {
    if (!member) return 'MC';
    const hasBaptism = hasBaptismCompleted(member);
    const hasMembership = hasMembershipCompleted(member, courseTemplates);
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

