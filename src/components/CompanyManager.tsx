import React, { useState, useRef } from 'react';
import { Company } from '../types';
import { apiSaveCompany, apiDeleteCompany } from '../lib/db';
import { validarCNPJ } from '../lib/utils';
import { 
  Building2, Search, Plus, Trash2, Edit3, X, MapPin
} from 'lucide-react';

interface CompanyManagerProps {
  companies: Company[];
  onRefreshCompanies: () => void;
  showToast: (msg: string, isError?: boolean) => void;
}

export default function CompanyManager({ companies, onRefreshCompanies, showToast }: CompanyManagerProps) {
  const [activeModal, setActiveModal] = useState<Partial<Company> | null>(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenModal = (c?: Company) => {
    if (c) {
      setActiveModal(c);
    } else {
      setActiveModal({
        razao_social: '', cnpj: '', ie: '', endereco: '', telefone: '', email: '', 
        rep_nome: '', rep_cpf: '', rep_rg: '', rep_cargo: '', porte: 'ME', incluir_contador: false,
        cont_nome: '', cont_crc: '', cont_cpf: '', cont_escritorio: ''
      });
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModal?.razao_social || !activeModal?.cnpj) {
      showToast('Razão Social e CNPJ são obrigatórios.', true);
      return;
    }

    const numericCnpj = activeModal.cnpj.replace(/\D/g, '');
    if (numericCnpj.length !== 14 || !validarCNPJ(numericCnpj)) {
      showToast('O CNPJ informado é inválido.', true);
      return;
    }

    const payload = {
      ...activeModal,
      rep_rg: activeModal.rep_rg || '',
      rep_cpf: activeModal.rep_cpf || '',
      rep_nome: activeModal.rep_nome || '',
      rep_cargo: activeModal.rep_cargo || '',
      telefone: activeModal.telefone || '',
      email: activeModal.email || '',
      endereco: activeModal.endereco || '',
      ie: activeModal.ie || '',
      cont_nome: activeModal.cont_nome || '',
      cont_cpf: activeModal.cont_cpf || '',
      cont_crc: activeModal.cont_crc || '',
      cont_escritorio: activeModal.cont_escritorio || ''
    } as Company;

    try {
      await apiSaveCompany(payload);
      showToast('Empresa salva com sucesso!');
      onRefreshCompanies();
      handleCloseModal();
    } catch (e: any) {
      showToast('Erro ao salvar empresa: ' + e.message, true);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Esta ação não afetará os PDFs já gerados.')) return;
    try {
      await apiDeleteCompany({ id } as Company);
      showToast('Empresa excluída com sucesso.');
      onRefreshCompanies();
    } catch (e: any) {
      showToast('Erro ao excluir empresa: ' + e.message, true);
    }
  };

  const handleCnpjLookup = async () => {
    if (!activeModal) return;
    const numericCnpj = (activeModal.cnpj || '').replace(/\D/g, '');
    if (numericCnpj.length !== 14) {
      showToast('Digite um CNPJ válido com 14 dígitos.', true);
      return;
    }

    if (!validarCNPJ(numericCnpj)) {
      showToast('CNPJ inválido (Dígito Verificador incorreto).', true);
      return;
    }

    setLoadingCnpj(true);
    showToast('Consultando CNPJ no banco de dados da Receita Federal...');
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numericCnpj}`);
      if (!res.ok) {
        throw new Error('Empresa não cadastrada ou limite de requisições atingido.');
      }
      const data = await res.json();
      
      const enderecoPartes = [
        `${data.descricao_tipo_de_logradouro || ''} ${data.logradouro || ''}`.trim(),
        data.numero ? `nº ${data.numero}` : '',
        data.bairro || '',
        data.municipio ? `${data.municipio}/${data.uf || ''}` : '',
        data.cep ? `CEP ${data.cep}` : ''
      ].filter(Boolean);

      const formattedCnpj = numericCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");

      setActiveModal(prev => ({
        ...prev,
        razao_social: data.razao_social || '',
        cnpj: formattedCnpj,
        endereco: enderecoPartes.join(', ')
      }));
      showToast('Dados corporativos preenchidos com sucesso!');
    } catch (e: any) {
      showToast(e.message, true);
    } finally {
      setLoadingCnpj(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('O arquivo deve ter no máximo 2MB', true);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setActiveModal(prev => ({ ...prev, logo_data_url: reader.result as string }));
        showToast('Logotipo carregado na memória!');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 text-[#e8ebf0]">
      <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-[#2d3548] pb-3 mb-2 flex-wrap gap-2">
          <h3 className="text-md font-serif font-bold text-[#d4a574] flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#d4a574]" />
            <span>Gerenciador de Empresas ({companies.length})</span>
          </h3>
          <button
            onClick={() => handleOpenModal()}
            className="py-2 px-4 bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Empresa</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(c => (
            <div key={c.id} className="p-4 bg-[#232a3d] border border-[#2d3548] rounded-xl flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h5 className="font-bold text-sm text-[#e8ebf0] leading-tight">{c.razao_social}</h5>
                  {c.logo_data_url && (
                    <img src={c.logo_data_url} alt="Logo" className="h-6 w-auto object-contain bg-white rounded px-1" />
                  )}
                </div>
                <p className="text-xs font-mono text-[#8892a6]">CNPJ: {c.cnpj}</p>
                <p className="text-[11px] text-[#8892a6] flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{c.endereco || 'Sem endereço'}</span>
                </p>
                <div className="pt-2 border-t border-[#2d3548]">
                  <p className="text-[10px] text-[#8892a6] uppercase tracking-wider">Representante</p>
                  <p className="text-[11px] text-[#e8ebf0]">{c.rep_nome || 'Não informado'} {c.rep_cpf ? `(CPF: ${c.rep_cpf})` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2 border-t border-[#2d3548] pt-3">
                <button
                  onClick={() => handleOpenModal(c)}
                  className="flex-1 p-1.5 bg-[#2d3548] hover:bg-[#3b455c] text-[#e8ebf0] rounded text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => c.id && handleDeleteCompany(c.id)}
                  className="p-1.5 bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-500/10 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {companies.length === 0 && (
             <div className="col-span-full p-8 text-center text-[#8892a6] italic bg-[#232a3d]/50 rounded-xl border border-[#2d3548]">
               Nenhuma empresa cadastrada. Clique em "Nova Empresa" para adicionar.
             </div>
          )}
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a2030] border border-[#2d3548] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[#2d3548] flex justify-between items-center text-[#e8ebf0]">
              <h3 className="font-serif font-bold text-lg text-[#d4a574]">
                {activeModal.id ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
              </h3>
              <button onClick={handleCloseModal} className="text-[#8892a6] hover:text-[#e8ebf0] cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form id="companyForm" onSubmit={handleSaveCompany} className="flex flex-col min-h-0">
              <div className="p-5 overflow-y-auto space-y-4">
                  {/* Basic Data */}
                  <div>
                    <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">Razão Social *</label>
                    <input
                      type="text"
                      required
                      value={activeModal.razao_social || ''}
                      onChange={(e) => setActiveModal(prev => ({ ...prev!, razao_social: e.target.value }))}
                      className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">CNPJ *</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          value={activeModal.cnpj || ''}
                          onChange={(e) => setActiveModal(prev => ({ ...prev!, cnpj: e.target.value }))}
                          placeholder="00.000.000/0001-00"
                          className="flex-1 bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCnpjLookup}
                          disabled={loadingCnpj}
                          className="bg-[#2d3548] hover:bg-[#232a3d] text-[#d4a574] border border-[#2d3548] hover:border-[#d4a574]/40 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          {loadingCnpj ? <div className="w-3.5 h-3.5 border-2 border-[#d4a574] border-t-transparent rounded-full animate-spin"></div> : <Search className="w-3.5 h-3.5" />}
                          <span>Buscar</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">Inscrição Estadual (IE)</label>
                      <input
                        type="text"
                        value={activeModal.ie || ''}
                        onChange={(e) => setActiveModal(prev => ({ ...prev!, ie: e.target.value }))}
                        className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">Endereço Completo</label>
                    <input
                      type="text"
                      value={activeModal.endereco || ''}
                      onChange={(e) => setActiveModal(prev => ({ ...prev!, endereco: e.target.value }))}
                      className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">Telefone</label>
                      <input
                        type="text"
                        value={activeModal.telefone || ''}
                        onChange={(e) => setActiveModal(prev => ({ ...prev!, telefone: e.target.value }))}
                        className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-1">E-mail</label>
                      <input
                        type="email"
                        value={activeModal.email || ''}
                        onChange={(e) => setActiveModal(prev => ({ ...prev!, email: e.target.value }))}
                        className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Representative Subgroup */}
                  <div className="border-t border-[#2d3548] pt-4 mt-2">
                    <span className="text-[11px] font-mono tracking-widest text-[#d4a574] uppercase block mb-3">Representante Legal</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase text-[#8892a6] mb-1">Nome Completo</label>
                        <input
                          type="text"
                          value={activeModal.rep_nome || ''}
                          onChange={(e) => setActiveModal(prev => ({ ...prev!, rep_nome: e.target.value }))}
                          className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-[#8892a6] mb-1">Cargo / Atribuição</label>
                        <input
                          type="text"
                          value={activeModal.rep_cargo || ''}
                          onChange={(e) => setActiveModal(prev => ({ ...prev!, rep_cargo: e.target.value }))}
                          className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-[#8892a6] mb-1">CPF</label>
                        <input
                          type="text"
                          value={activeModal.rep_cpf || ''}
                          onChange={(e) => setActiveModal(prev => ({ ...prev!, rep_cpf: e.target.value }))}
                          className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-[#8892a6] mb-1">RG / Órgão</label>
                        <input
                          type="text"
                          value={activeModal.rep_rg || ''}
                          onChange={(e) => setActiveModal(prev => ({ ...prev!, rep_rg: e.target.value }))}
                          className="w-full bg-[#232a3d] border border-[#2d3548] rounded-lg px-3 py-2 text-sm text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Porte e Contador section */}
                  <div className="border-t border-[#2d3548] pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase text-[#8892a6] mb-1">Porte Tributário</label>
                      <div className="flex gap-4 mt-2">
                        <label className="inline-flex items-center gap-1.5 text-xs text-[#e8ebf0] cursor-pointer">
                          <input type="radio" name="porte" value="ME" checked={activeModal.porte === 'ME'} onChange={() => setActiveModal(p => ({ ...p!, porte: 'ME' }))} className="accent-[#d4a574]" /> ME
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs text-[#e8ebf0] cursor-pointer">
                          <input type="radio" name="porte" value="EPP" checked={activeModal.porte === 'EPP'} onChange={() => setActiveModal(p => ({ ...p!, porte: 'EPP' }))} className="accent-[#d4a574]" /> EPP
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs text-[#e8ebf0] cursor-pointer">
                          <input type="radio" name="porte" value="NAO" checked={activeModal.porte === 'NAO' || !activeModal.porte} onChange={() => setActiveModal(p => ({ ...p!, porte: 'NAO' }))} className="accent-[#d4a574]" /> Outro
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="inline-flex items-center gap-2 text-xs text-[#8892a6] cursor-pointer mt-5">
                        <input type="checkbox" checked={activeModal.incluir_contador || false} onChange={(e) => setActiveModal(p => ({ ...p!, incluir_contador: e.target.checked }))} className="rounded accent-[#d4a574] w-4 h-4" />
                        <span>Acoplar dados do Contador</span>
                      </label>
                    </div>
                  </div>

                  {activeModal.incluir_contador && (
                    <div className="mt-3 p-4 bg-[#232a3d] border border-[#2d3548] rounded-xl space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] uppercase text-[#8892a6]">Nome do Contador</label>
                          <input type="text" value={activeModal.cont_nome || ''} onChange={(e) => setActiveModal(p => ({ ...p!, cont_nome: e.target.value }))} className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-[#8892a6]">Registro CRC</label>
                          <input type="text" value={activeModal.cont_crc || ''} onChange={(e) => setActiveModal(p => ({ ...p!, cont_crc: e.target.value }))} className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-[#8892a6]">CPF do Contador</label>
                          <input type="text" value={activeModal.cont_cpf || ''} onChange={(e) => setActiveModal(p => ({ ...p!, cont_cpf: e.target.value }))} className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none" />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-[#8892a6]">Escritório / Local</label>
                          <input type="text" value={activeModal.cont_escritorio || ''} onChange={(e) => setActiveModal(p => ({ ...p!, cont_escritorio: e.target.value }))} className="w-full bg-[#1a2030] border border-[#2d3548] rounded-lg px-2.5 py-1.5 text-xs text-[#e8ebf0] focus:border-[#d4a574] focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Logo */}
                  <div className="border-t border-[#2d3548] pt-4 mt-2">
                    <label className="block text-xs uppercase font-mono text-[#8892a6] tracking-wider mb-2">Logo corporativo</label>
                    <div className="flex flex-wrap items-center gap-4">
                      <input type="file" ref={fileInputRef} accept="image/png, image/jpeg" onChange={handleLogoUpload} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-[#232a3d] hover:bg-[#2d3548] border border-[#2d3548] hover:border-[#d4a574] px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer text-[#e8ebf0]">Anexar Arquivo</button>
                      {activeModal.logo_data_url && (
                        <button type="button" onClick={() => setActiveModal(p => ({...p!, logo_data_url: undefined}))} className="text-red-400 text-xs font-semibold cursor-pointer">Excluir Logo</button>
                      )}
                    </div>
                    {activeModal.logo_data_url && (
                      <div className="mt-3 inline-block bg-white p-2 rounded-lg border border-[#2d3548]">
                        <img src={activeModal.logo_data_url} alt="Logo corporativo" className="max-h-12 w-auto object-contain" />
                      </div>
                    )}
                  </div>
              </div>
            
              <div className="p-5 border-t border-[#2d3548] flex justify-end gap-3 bg-[#1e2538] flex-shrink-0">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2 rounded-lg bg-[#232a3d] hover:bg-[#2d3548] border border-[#2d3548] text-sm text-[#e8ebf0] font-semibold transition-all cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-2 rounded-lg bg-[#d4a574] hover:bg-[#e0b585] text-[#0f1419] font-bold text-sm transition-all cursor-pointer shadow-lg shadow-[#d4a574]/20">
                  Salvar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
