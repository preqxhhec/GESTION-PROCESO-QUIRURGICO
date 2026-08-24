


    function showModal(options) {
        return new Promise((resolve) => {
            const { title, message, icon, confirmText, cancelText, type } = options;
            document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal-box">
                    <span class="modal-icon">${icon || '⚠️'}</span>
                    <div class="modal-title">${title || 'Confirmar'}</div>
                    <div class="modal-message">${message || '¿Estás seguro?'}</div>
                    <div class="modal-actions">
                        ${cancelText ? `<button class="modal-btn modal-btn-cancel" data-action="cancel">${cancelText}</button>` : ''}
                        <button class="modal-btn ${type === 'danger' ? 'modal-btn-confirm' : 'modal-btn-success'}" data-action="confirm">${confirmText || 'Aceptar'}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            if (type === 'danger') {
                const confirmBtn = overlay.querySelector('.modal-btn-confirm');
                setTimeout(() => {
                    confirmBtn.classList.add('danger-shake');
                }, 300);
            }
            let isResolved = false;

            function closeModal(result) {
                if (isResolved) return;
                isResolved = true;
                const box = overlay.querySelector('.modal-box');
                box.classList.add('closing');
                overlay.classList.add('closing');
                setTimeout(() => {
                    overlay.remove();
                    resolve(result);
                }, 300);
            }
            overlay.querySelector('[data-action="confirm"]').addEventListener('click', function() {
                closeModal(true);
            });
            const cancelBtn = overlay.querySelector('[data-action="cancel"]');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    closeModal(false);
                });
            }
            if (cancelText) {
                overlay.addEventListener('click', function(e) {
                    if (e.target === overlay) {
                        closeModal(false);
                    }
                });
            }
            const handleEsc = function(e) {
                if (e.key === 'Escape') {
                    closeModal(false);
                    document.removeEventListener('keydown', handleEsc);
                }
            };
            document.addEventListener('keydown', handleEsc);
        });
    }



// =============================================================
// ⏳ MODAL DE "GUARDANDO..."
// =============================================================
function mostrarModalGuardando() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalGuardando';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width: 400px;">
            <span class="modal-icon" style="font-size: 3rem;">⏳</span>
            <div class="modal-title">Guardando datos...</div>
            <div class="modal-message" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: center; gap: 8px; margin: 16px 0;">
                    <div class="spinner-dot" style="width:12px; height:12px; background:#1e293b; border-radius:50%; display:inline-block; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.32s;"></div>
                    <div class="spinner-dot" style="width:12px; height:12px; background:#1e293b; border-radius:50%; display:inline-block; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.16s;"></div>
                    <div class="spinner-dot" style="width:12px; height:12px; background:#1e293b; border-radius:50%; display:inline-block; animation: bounce 1.4s infinite ease-in-out both;"></div>
                </div>
                <p style="font-size:0.9rem; color:#64748b;">Sincronizando datos con el servidor...</p>
                <p style="font-size:0.75rem; color:#94a3b8; margin-top:8px;">Por favor espera</p>
            </div>
            <div class="modal-actions" style="justify-content:center;">
                <button class="modal-btn modal-btn-cancel" id="cancelarGuardado" style="min-width:auto; padding:8px 20px; font-size:0.8rem;">Cancelar</button>
            </div>
        </div>
    `;

    // Estilos para la animación de los dots
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
    `;
    overlay.appendChild(style);

    document.body.appendChild(overlay);

    // Botón cancelar (opcional)
    const cancelBtn = overlay.querySelector('#cancelarGuardado');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            // Solo cerrar el modal, no cancelar el guardado (Firebase no soporta cancelación)
            cerrarModalGuardando(overlay);
        });
    }

    return overlay;
}

function cerrarModalGuardando(overlay) {
    if (overlay) {
        const box = overlay.querySelector('.modal-box');
        if (box) box.classList.add('closing');
        overlay.classList.add('closing');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 300);
    }
}




    // =============================================================
    // 🎨 SELECTOR DE COLOR
    // =============================================================
    function crearSelectorColor(rowKey, valorActual) {
        const colors = [
            '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
            '#8B5CF6', '#EC4899', '#F97316', '#14B8A6',
            '#6366F1', '#F472B6', '#22D3EE', '#34D399', '#FBBF24'
        ];

        const wrapper = document.createElement('div');
        wrapper.className = 'color-picker-wrapper';

        const btn = document.createElement('button');
        btn.className = 'color-picker-btn';
        btn.type = 'button';

        const indicator = document.createElement('span');
        indicator.className = 'color-indicator';

        if (valorActual && valorActual !== '') {
            indicator.style.background = valorActual;
            indicator.classList.remove('empty');
        } else {
            indicator.classList.add('empty');
            indicator.textContent = '🎨';
        }

        btn.appendChild(indicator);
        wrapper.appendChild(btn);

        const dropdown = document.createElement('div');
        dropdown.className = 'color-picker-dropdown';

        const emptyOption = document.createElement('div');
        emptyOption.className = 'color-option-empty';
        emptyOption.textContent = '✕';
        emptyOption.title = 'Quitar color';
        emptyOption.addEventListener('click', function(e) {
            e.stopPropagation();
            const color = '';
            indicator.style.background = '';
            indicator.classList.add('empty');
            indicator.textContent = '🎨';
            dropdown.classList.remove('active');
            guardarColorFila(rowKey, color);
            actualizarFilaColor(rowKey, color);
        });
        dropdown.appendChild(emptyOption);

        colors.forEach(color => {
            const option = document.createElement('div');
            option.className = 'color-option';
            option.dataset.color = color;
            option.style.background = color;
            if (valorActual === color) {
                option.classList.add('selected');
            }
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                const selectedColor = this.dataset.color;
                indicator.style.background = selectedColor;
                indicator.classList.remove('empty');
                indicator.textContent = '';
                dropdown.classList.remove('active');
                guardarColorFila(rowKey, selectedColor);
                actualizarFilaColor(rowKey, selectedColor);
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
            });
            dropdown.appendChild(option);
        });

        wrapper.appendChild(dropdown);

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('active');
            const rect = wrapper.getBoundingClientRect();
            const dropdownWidth = 180;
            const spaceRight = window.innerWidth - rect.right;
            if (spaceRight >= dropdownWidth) {
                dropdown.style.left = '0';
                dropdown.style.right = 'auto';
                dropdown.style.transform = 'none';
            } else {
                dropdown.style.left = 'auto';
                dropdown.style.right = '0';
                dropdown.style.transform = 'none';
            }
        });

        document.addEventListener('click', function(e) {
            if (!wrapper.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        return wrapper;
    }

    function guardarColorFila(rowKey, color) {
        const parts = rowKey.split('-').map(Number);
        if (parts.length === 4) {
            const [s, d, p, f] = parts;
            const semana = semanas[s];
            if (semana) {
                const day = semana[d];
                if (day) {
                    const pabName = PABS[p];
                    if (pabName) {
                        const rows = day.pabs[pabName];
                        if (rows && rows[f]) {
                            rows[f]['Color'] = color;
                        }
                    }
                }
            }
        }
    }

    function actualizarFilaColor(rowKey, color) {
        const tr = document.querySelector(`tr[data-rowkey="${rowKey}"]`);
        if (tr) {
            const td = tr.querySelector('td.col-color');
            if (td) {
                const indicator = td.querySelector('.color-indicator');
                if (indicator) {
                    if (color && color !== '') {
                        indicator.style.background = color;
                        indicator.classList.remove('empty');
                        indicator.textContent = '';
                    } else {
                        indicator.style.background = '';
                        indicator.classList.add('empty');
                        indicator.textContent = '🎨';
                    }
                }
            }
        }
    }