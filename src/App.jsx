import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// CONFIG & API
// ==========================================
const CONFIG = {
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyrkClR5XvEIchMdKjjaYKoHrC4WmjbBVG-QR7F9_4Yj1PPpv0WgnbuwdBkWwMuNfbG/exec"
};

const api = {
    fetchAll: async () => {
        const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=readAll`);
        return await response.json();
    },
    post: async (payload) => {
        const response = await fetch(CONFIG.APPS_SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        return await response.json();
    }
};

// ==========================================
// UTILS
// ==========================================
const getCleanImageUrl = (url) => {
    if (!url) return '';
    const u = url.trim();
    if (u.includes('drive.google.com') || u.includes('docs.google.com')) {
        let id = '';
        const parts = u.split(/\/d\//);
        if (parts.length > 1) id = parts[1].split('/')[0];
        if (!id && u.includes('id=')) {
            const match = u.match(/id=([a-zA-Z0-9_-]+)/);
            if (match && match[1]) id = match[1];
        }
        if (!id) {
             const match = u.match(/[-\w]{25,}/);
             if (match && match[0]) id = match[0];
        }
        if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1920`;
    }
    return u;
};

const getCleanPdfUrl = (url) => {
    if (!url) return '';
    const u = url.trim();
    if (u.includes('drive.google.com')) {
        return u.replace(/\/view.*/, '/preview').replace(/\/open\?id=/, '/file/d/').replace(/\/edit.*/, '/preview');
    }
    return u;
};

const getExcerpt = (html, length = 10) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    let text = tmp.textContent || tmp.innerText || "";
    return text.length > length ? text.substring(0, length) + "..." : text;
};

const smartLinkify = (htmlContent) => {
    if (!htmlContent) return '';
    const parts = htmlContent.split(/((?:<[^>]+>))/g);
    const linkedParts = parts.map(part => {
        if (part.trim().startsWith('<')) return part;
        return part.replace(
            /(https?:\/\/[^\s]+)/g, 
            '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline break-all">$1</a>'
        );
    });
    return linkedParts.join('');
};

// ==========================================
// COMPONENTS
// ==========================================

const Navbar = ({ setPage, logoUrl, schoolName, schoolNameEN, pages, mainMenus }) => {
    const [activeDropdown, setActiveDropdown] = useState(null);

    const sortedMenus = mainMenus ? [...mainMenus]
        .filter(m => m.ID !== 'contact') 
        .sort((a,b) => Number(a.Order||0) - Number(b.Order||0)) : [];
    
    const menuRows = [];
    for (let i = 0; i < sortedMenus.length; i += 7) {
        menuRows.push(sortedMenus.slice(i, i + 7));
    }

    const getSubMenu = (cat) => pages
        .filter(p => p.MenuCategory === cat)
        .sort((a,b) => Number(a.Order||0) - Number(b.Order||0))
        .map(p => ({
            id: p.PageKey, 
            label: p.PageLabel || '' 
        }));
    
    const handleSubMenuClick = (e, id) => { 
        e.stopPropagation(); 
        setPage({id: 'page', key: id}); 
        setActiveDropdown(null); 
    };
    
    const handleMenuClick = (e, m) => {
        e.preventDefault(); 
        if (m.Type === 'link') { setPage({id: m.ID}); setActiveDropdown(null); } 
        else if (m.Type === 'dropdown') { setActiveDropdown(prev => prev === m.ID ? null : m.ID); } 
        else if (m.Type === 'page') {
            const targetPage = pages.find(p => p.MenuCategory === m.ID);
            if (targetPage) setPage({id: 'page', key: targetPage.PageKey});
            setActiveDropdown(null);
        }
    };

    useEffect(() => {
        const closeMenu = () => setActiveDropdown(null);
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);

    return (
        <nav className="w-full bg-white/95 backdrop-blur-md shadow-lg sticky top-0 z-[100] border-b border-gray-100 min-h-[6rem] py-2" onClick={e => e.stopPropagation()}>
            <div className="content-container flex items-center gap-4 lg:gap-8">
                <div className="flex items-center gap-4 cursor-pointer flex-shrink-0 relative z-20 py-2 pr-4" onClick={() => { setPage({id: 'home'}); setActiveDropdown(null); }}>
                    <img src={getCleanImageUrl(logoUrl) || 'https://via.placeholder.com/150?text=Logo'} className="w-14 h-14 md:w-16 md:h-16 object-contain" onError={(e)=>e.target.style.display='none'} />
                    <div className="flex flex-col justify-center">
                        <h1 className="text-xl md:text-2xl font-bold text-primary leading-none whitespace-nowrap">{schoolName}</h1>
                        <p className="text-sm text-gray-500 font-medium tracking-wide mt-1 whitespace-nowrap">{schoolNameEN || 'Phukhamkrutmaneeuthit School'}</p>
                    </div>
                </div>

                <div className="flex flex-col items-end justify-center gap-1 h-full flex-1 min-w-0"> 
                    {menuRows.map((row, rowIndex) => (
                        <div key={rowIndex} className={`flex ${row.length === 7 ? 'justify-between' : 'justify-start gap-6 lg:gap-8'} items-center w-full`}>
                            {row.map((m, i) => {
                                const sub = m.Type === 'dropdown' ? getSubMenu(m.ID) : [];
                                const isOpen = activeDropdown === m.ID; 
                                return (
                                    <div key={m.ID} className="relative group h-full flex items-center px-1 cursor-pointer select-none">
                                        <span onClick={(e) => handleMenuClick(e, m)} className="nav-link flex items-center gap-1 uppercase tracking-wide">
                                            {m.Label} {m.Type === 'dropdown' && <i className={`fas fa-chevron-down text-[10px] opacity-50 ml-1 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>}
                                        </span>
                                        {m.Type === 'dropdown' && sub.length > 0 && (
                                            <div className={`dropdown-menu ${isOpen ? 'dropdown-visible' : ''} ${row.length === 7 && i >= row.length - 2 ? 'dropdown-right' : ''}`}>
                                                <div className="flex flex-col gap-1">
                                                    {sub.map(s => (
                                                        <div key={s.id} onClick={(e) => handleSubMenuClick(e, s.id)} className="px-4 py-3 rounded-lg hover:bg-blue-50 hover:text-[#004993] transition-all duration-200 text-base font-medium whitespace-nowrap cursor-pointer flex items-center group/item text-slate-600 hover:pl-6">
                                                            <span className="w-6 flex items-center justify-center mr-1"><i className="fas fa-chevron-right text-[10px] text-gray-300 group-hover/item:text-[#004993] transition-colors"></i></span>{s.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </nav>
    );
};

const Hero = ({ banners }) => {
    const activeBanners = banners ? banners.filter(b => String(b.Active).trim().toUpperCase() === 'TRUE').sort((a,b) => Number(a.Order||0) - Number(b.Order||0)) : [];
    const displayBanners = activeBanners.length > 0 ? activeBanners : [{ ImageURL: 'https://via.placeholder.com/1920x800/003366/ffffff?text=No+Active+Banner', Caption: 'ยินดีต้อนรับ' }];
    const [idx, setIdx] = useState(0);
    useEffect(() => { if (displayBanners.length <= 1) return; const interval = setInterval(() => setIdx(prev => (prev + 1) % displayBanners.length), 5000); return () => clearInterval(interval); }, [displayBanners.length]);

    return (
        <div className="w-full max-w-[1920px] mx-auto relative aspect-[1920/800] bg-primary group overflow-hidden">
            {displayBanners.map((b, i) => (
                <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === idx ? 'opacity-100' : 'opacity-0'}`}>
                    <img src={getCleanImageUrl(b.ImageURL)} className={`slide-image ${i === idx ? 'slide-active' : ''}`} onError={(e)=>{e.target.onerror=null; e.target.src='https://via.placeholder.com/1920x800/003366/ffffff?text=Image+Error';}} />
                </div>
            ))}
            {displayBanners[idx].Caption && (
                <div className="absolute inset-0 z-20 flex flex-col justify-end items-center text-center p-4 pb-12 pointer-events-none">
                    <div className="content-container"><h2 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-2xl tracking-tight leading-tight" style={{textShadow: '0 2px 4px rgba(0,0,0,0.5)'}}>{displayBanners[idx].Caption}</h2></div>
                </div>
            )}
            {displayBanners.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 z-30">
                    {displayBanners.map((_, i) => (<button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${i === idx ? 'bg-white w-8' : 'bg-white/40 w-2 hover:bg-white/60'}`}></button>))}
                </div>
            )}
        </div>
    );
};

const NewsletterSection = ({ items }) => {
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const activeItems = items ? items.filter(b => String(b.Active).trim().toUpperCase() === 'TRUE').sort((a,b) => Number(b.Order||0) - Number(a.Order||0)) : [];
    if (activeItems.length === 0) return null;

    const onMouseDown = (e) => { setIsDragging(true); setStartX(e.pageX - scrollRef.current.offsetLeft); setScrollLeft(scrollRef.current.scrollLeft); };
    const scroll = (direction) => { if(scrollRef.current) { const amount = 350; scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' }); }};

    return (
        <div className="w-full bg-slate-100 py-12 border-b border-gray-200">
            <div className="content-container">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold text-primary border-l-8 border-primary pl-4">จดหมายข่าว</h2>
                    <div className="flex gap-2">
                        <button onClick={() => scroll('left')} className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition shadow-sm"><i className="fas fa-chevron-left"></i></button>
                        <button onClick={() => scroll('right')} className="w-10 h-10 rounded-full bg-white border border-gray-300 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition shadow-sm"><i className="fas fa-chevron-right"></i></button>
                    </div>
                </div>
                <div ref={scrollRef} className={`flex gap-6 overflow-x-auto scrollbar-hide pb-4 ${isDragging ? 'cursor-grabbing snap-none' : 'cursor-grab snap-x snap-mandatory'}`} onMouseDown={onMouseDown} onMouseLeave={()=>setIsDragging(false)} onMouseUp={()=>setIsDragging(false)} onMouseMove={(e)=>{if(!isDragging)return;e.preventDefault();const x = e.pageX - scrollRef.current.offsetLeft; const walk = (x - startX) * 2; scrollRef.current.scrollLeft = scrollLeft - walk;}}>
                    {activeItems.map((item, idx) => (
                        <div key={idx} className="flex-shrink-0 w-[280px] md:w-[350px] snap-center bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group select-none">
                            <div className="relative overflow-hidden aspect-[1414/2000]"><img src={getCleanImageUrl(item.ImageURL)} className="w-full h-full object-cover pointer-events-none transition duration-500" onError={(e)=>{e.target.onerror=null; e.target.src='https://via.placeholder.com/1414x2000?text=Newsletter';}} /></div>
                            {item.Title && <div className="p-4 bg-white border-t border-gray-100"><h3 className="text-lg font-bold text-gray-800 line-clamp-2 text-center group-hover:text-primary transition">{item.Title}</h3></div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const NewsDetail = ({ item, defaultImage, onBack }) => {
    const imageUrl = item.ImageURL ? getCleanImageUrl(item.ImageURL) : (defaultImage ? getCleanImageUrl(defaultImage) : '');
    const hasImage = !!imageUrl;
    
    return (
        <div className="w-full bg-white min-h-[calc(100vh-6rem)]">
            <div className="content-container py-12 fade-in">
                <button onClick={onBack} className="mb-6 text-primary font-bold flex items-center gap-2 hover:underline"><i className="fas fa-arrow-left"></i> ย้อนกลับ</button>
                <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
                    {hasImage && <div className="w-full flex justify-center bg-gray-100 border-b border-gray-100"><img src={imageUrl} className="w-full h-auto object-cover" style={{ maxHeight: '600px', width: 'auto', maxWidth: '100%' }} onError={(e)=>{e.target.onerror=null; e.target.src='https://via.placeholder.com/1280x720?text=No+Image';}} /></div>}
                    <div className="p-12 md:p-16 max-w-5xl mx-auto">
                        <div className="flex flex-wrap items-center gap-4 mb-8">
                            <span className="bg-blue-50 text-[#003366] px-4 py-1.5 rounded-full text-sm font-bold shadow-sm border border-blue-100">{item.Category}</span>
                            <span className="text-gray-500 text-sm flex items-center gap-2 font-medium"><i className="far fa-calendar-alt"></i> {new Date(item.Date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-10 leading-tight">{item.Title}</h1>
                        <div className="prose prose-lg prose-blue max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap html-content" dangerouslySetInnerHTML={{__html: smartLinkify(item.Content)}} />
                    </div>
                    {(item.PDF_URL || item.Link_URL) && (
                        <div className="w-full bg-gray-50 border-t border-gray-200 p-8 md:p-12 flex flex-col md:flex-row justify-center gap-4">
                            {item.PDF_URL && <a href={getCleanPdfUrl(item.PDF_URL)} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-[#DC2626] text-white rounded-xl font-bold shadow-lg hover:bg-[#C62323] transition flex items-center justify-center gap-3 text-lg hover:-translate-y-1 transform duration-200"><i className="fas fa-file-pdf text-2xl"></i> <span>เปิดเอกสารแนบ (PDF)</span></a>}
                            {item.Link_URL && <a href={item.Link_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-3 text-lg hover:-translate-y-1 transform duration-200"><i className="fas fa-external-link-alt text-2xl"></i> <span>{item.Link_Label || 'ไปที่ลิงก์'}</span></a>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const NewsCard = ({ n, defaultImage, onClick }) => {
    const imageUrl = n.ImageURL ? getCleanImageUrl(n.ImageURL) : (defaultImage ? getCleanImageUrl(defaultImage) : '');
    const hasImage = !!imageUrl;
    
    return (
        <div onClick={onClick} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col group cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition duration-300 transform">
            <div className="aspect-[16/9] w-full overflow-hidden relative bg-gray-100">
                    {hasImage ? (
                    <>
                        <img src={imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" onError={(e)=>{e.target.onerror=null; e.target.src='https://via.placeholder.com/400?text=News';}} />
                        {n.PDF_URL && <div className="absolute bottom-2 right-2 bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-10" title="มีเอกสาร PDF"><i className="fas fa-file-pdf text-lg"></i></div>}
                    </>
                    ) : (
                    n.PDF_URL ? <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 flex-col"><i className="fas fa-file-pdf text-4xl mb-2 text-red-500"></i><span className="text-sm font-bold">เอกสาร PDF</span></div> : <div className="w-full h-full bg-white"></div>
                    )}
                    <div className="absolute top-4 left-4 pointer-events-none"><span className="bg-white/95 backdrop-blur text-[#003366] text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">{n.Category}</span></div>
            </div>
            <div className="p-8 flex-1 flex flex-col">
                <div className="text-xs text-gray-400 mb-3 font-medium flex items-center gap-2"><i className="far fa-clock"></i> {new Date(n.Date).toLocaleDateString('th-TH')}</div>
                <h3 className="font-bold text-xl mb-3 text-primary line-clamp-2 group-hover:text-[#004993] transition leading-snug">{n.Title}</h3>
                <p className="text-gray-500 text-sm mb-6 flex-1 leading-relaxed">{getExcerpt(n.Content, 10)}</p>
                <div className="pt-5 border-t border-gray-50 text-[#004993] text-sm font-bold group-hover:underline flex items-center gap-1">อ่านเพิ่มเติม <i className="fas fa-arrow-right text-xs transition-transform group-hover:translate-x-1"></i></div>
            </div>
        </div>
    );
};

const Footer = ({ schoolName, schoolNameEN, schoolAddress, schoolPhone, fbName, fbUrl, logoUrl, onAdminClick }) => {
    return (
        <footer className="bg-primary text-white pt-16 pb-8 mt-auto">
            <div className="content-container">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-4 mb-6">
                            <img src={getCleanImageUrl(logoUrl)} className="w-14 h-14 bg-white rounded-full p-1 object-contain" onError={(e)=>e.target.style.display='none'}/>
                            <div><h3 className="font-bold text-xl leading-tight">{schoolName}</h3><p className="text-blue-300 text-sm">{schoolNameEN || 'Phukhamkrutmaneeuthit School'}</p></div>
                        </div>
                        <ul className="space-y-4 text-blue-100">
                            <li className="flex items-start gap-3"><i className="fas fa-map-marker-alt mt-1.5 text-blue-300 w-5 text-center"></i><span className="leading-relaxed text-sm md:text-base">{schoolAddress || 'ที่อยู่โรงเรียน'}</span></li>
                            <li className="flex items-center gap-3"><i className="fas fa-phone text-blue-300 w-5 text-center"></i><span className="font-medium tracking-wide">{schoolPhone}</span></li>
                            {fbName && fbUrl && <li className="flex items-center gap-3"><i className="fab fa-facebook text-blue-300 w-5 text-center text-lg"></i><a href={fbUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white underline decoration-blue-300/50 hover:decoration-white transition font-medium">{fbName}</a></li>}
                        </ul>
                    </div>
                    <div className="md:col-span-2 h-72 bg-blue-800/50 rounded-2xl overflow-hidden border border-blue-700/50 shadow-inner relative group">
                        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3844.045628445485!2d101.04160677463287!3d15.535684485069131!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x311fb4ed6a487b41%3A0xea5d65ed104867a1!2z4LmC4Lij4LiH4LmA4Lij4Li14Lii4LiZ4Lie4Li44LiC4Liy4Lih4LiE4Lij4Li44LiR4Lih4LiT4Li14Lit4Li44LiX4Li04Lio!5e0!3m2!1sth!2sth!4v1764605736972!5m2!1sth!2sth" width="100%" height="100%" style={{border:0}} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="grayscale-[0.3] group-hover:grayscale-0 transition duration-700"></iframe>
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs text-primary font-bold shadow-lg pointer-events-none"><i className="fas fa-map-marked-alt mr-1"></i> แผนที่โรงเรียน</div>
                    </div>
                </div>
                <div className="border-t border-blue-800/50 pt-8 relative flex flex-col md:flex-row items-center justify-center">
                    <p className="text-sm text-blue-300 text-center">&copy; 2025 {schoolNameEN}. All Rights Reserved.</p>
                    <div onClick={onAdminClick} className="mt-4 md:mt-0 md:absolute md:right-0 text-blue-400 hover:text-white cursor-pointer transition-all hover:rotate-90 duration-500 p-2" title="เข้าสู่ระบบผู้ดูแลระบบ"><i className="fas fa-cog text-lg"></i></div>
                </div>
            </div>
        </footer>
    );
};

const AdminPanel = ({ data, reload, onLogout }) => {
    const [tab, setTab] = useState(() => {
        return sessionStorage.getItem('phukham_admin_tab') || 'News';
    });

    useEffect(() => {
        sessionStorage.setItem('phukham_admin_tab', tab);
    }, [tab]);

    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({});
    
    const getConfig = (key) => data.Config.find(c => c.Key === key)?.Value || '';

    const [settingsForm, setSettingsForm] = useState({ 
        SchoolLogo: '', 
        SchoolName: '',
        SchoolNameEN: '',
        SchoolAddress: '',
        SchoolPhone: '', 
        FacebookName: '',
        FacebookURL: '',
        DefaultNewsImage: '' 
    });

    const labelMap = { 
        'Title': 'หัวข้อ / ชื่อ', 
        'Content': 'เนื้อหา (HTML/Embed)', 
        'ImageURL': 'ลิงก์รูปภาพ (URL)', 
        'PDF_URL': 'ลิ้งก์ PDF (Google Drive)',
        'Link_URL': 'ลิงก์ปุ่มกด (External)',
        'Link_Label': 'ข้อความบนปุ่มกด',
        'Category': 'หมวดหมู่', 
        'Name': 'ชื่อ-นามสกุล', 
        'Position': 'ตำแหน่ง', 
        'Group': 'กลุ่มสาระ / ฝ่าย', 
        'Caption': 'คำบรรยายภาพ', 
        'Active': 'แสดงผล (TRUE/FALSE)', 
        'Value': 'ค่าที่กำหนด', 
        'Label': 'ชื่อเมนู', 
        'Type': 'ประเภทเมนู', 
        'ID': 'รหัสอ้างอิง', 
        'PageKey': 'รหัสหน้า', 
        'MenuCategory': 'แสดงในเมนูหลัก', 
        'Order': 'ลำดับการแสดงผล',
        'PageLabel': 'ชื่อเมนูย่อย (ใน Navbar)' 
    };
    const getLabel = (key) => labelMap[key] || key;
    
    const imageHints = {
        'Banners': 'แนะนำ 1920 x 800 px (แนวนอน)',
        'Newsletters': 'แนะนำ 1414 x 2000 px (แนวตั้ง A4)',
        'News': 'แนะนำ 1920 x 1080 px (16:9) หรือตามความเหมาะสม',
        'Personnel': 'แนะนำ 500 x 500 px (สี่เหลี่ยมจัตุรัส)',
        'Pages': 'แนะนำ 2000 x 1414 px (แนวนอน A4) หรือตามความเหมาะสม',
        'Menus': 'แนะนำ 1280 x 720 px (สำหรับ Header หน้า Page)'
    };

    const handleAddNew = () => {
        setEditItem({ _isNew: true });
        let initialForm = { Active: 'TRUE' };
        if (tab === 'News') {
            const defaultImg = getConfig('DefaultNewsImage');
            if (defaultImg) initialForm.ImageURL = defaultImg;
        }
        setForm(initialForm); 
    };

    const handleEdit = (item) => {
        setEditItem(item);
        let initialForm = { ...item };

        if (tab === 'Menus' && item.Type === 'page') {
            const linkedPage = data.Pages.find(p => p.MenuCategory === item.ID);
            if (linkedPage) {
                initialForm = {
                    ...initialForm,
                    _pageKey: linkedPage.PageKey,
                    _pageTitle: linkedPage.Title,
                    _pageContent: linkedPage.Content,
                    _pageImage: linkedPage.ImageURL,
                    _pageLabel: linkedPage.PageLabel 
                };
            } else {
                initialForm = {
                    ...initialForm,
                    _pageTitle: item.Label,
                    _pageContent: '',
                    _pageImage: '',
                    _pageLabel: ''
                };
            }
        }

        setForm(initialForm);
    };

    const handleSave = async (e) => { 
        e.preventDefault(); 
        if(!confirm('ยืนยันการบันทึก?')) return; 
        
        try {
            if (tab === 'Settings') { 
                const updates = [
                    { Key: 'SchoolLogo', Value: settingsForm.SchoolLogo },
                    { Key: 'SchoolName', Value: settingsForm.SchoolName },
                    { Key: 'SchoolNameEN', Value: settingsForm.SchoolNameEN },
                    { Key: 'SchoolAddress', Value: settingsForm.SchoolAddress },
                    { Key: 'SchoolPhone', Value: settingsForm.SchoolPhone },
                    { Key: 'FacebookName', Value: settingsForm.FacebookName },
                    { Key: 'FacebookURL', Value: settingsForm.FacebookURL },
                    { Key: 'DefaultNewsImage', Value: settingsForm.DefaultNewsImage } 
                ];

                await Promise.all(updates.map(item => 
                        api.post({ action: 'save', sheet: 'Config', data: item })
                ));
                
            } else if (tab === 'Menus') {
                const menuPayload = {
                    ID: editItem._isNew ? form.ID : form.ID,
                    Label: form.Label,
                    Type: form.Type,
                    Order: form.Order
                };
                await api.post({ action: 'save', sheet: 'Menus', data: menuPayload });

                if (form.Type === 'page') {
                    const pagePayload = {
                        PageKey: form._pageKey || ('page_' + Date.now()), 
                        Title: form._pageTitle || form.Label,
                        Content: form._pageContent || '',
                        ImageURL: form._pageImage || '',
                        MenuCategory: form.ID, 
                        Order: 1,
                        PageLabel: form._pageLabel || '' 
                    };
                    await api.post({ action: 'save', sheet: 'Pages', data: pagePayload });
                }

            } else { 
                const idToUse = editItem._isNew ? form.ID : (editItem.ID || editItem.PageKey);
                let payload = { ...form, ID: idToUse };
                if (tab === 'Pages') { payload.PageKey = idToUse; }
                
                if (tab === 'News' && !payload.Date) {
                    payload.Date = new Date();
                }

                await api.post({ action: 'save', sheet: tab, data: payload }); 
            } 
            
            alert('บันทึกเรียบร้อย'); 
            setEditItem(null); 
            setForm({}); 
            reload(); 
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ' + err.toString());
        }
    };

    const handleDelete = async (id) => { 
        let confirmMessage = 'ยืนยันการลบรายการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้';
        let relatedPagesToDelete = [];

        if (tab === 'Menus') {
            const menuItem = data.Menus.find(m => m.ID === id);
            if (menuItem && menuItem.Type !== 'link') {
                relatedPagesToDelete = data.Pages.filter(p => p.MenuCategory === id);
                if (relatedPagesToDelete.length > 0) {
                    confirmMessage = `คำเตือน! เมนูนี้มีเนื้อหาหน้าย่อย ${relatedPagesToDelete.length} รายการ\nหากลบเมนูนี้ เนื้อหาทั้งหมดจะถูกลบไปด้วย\n\nยืนยันการลบทั้งหมดหรือไม่?`;
                }
            }
        }

        if(confirm(confirmMessage)) { 
            try {
                if (relatedPagesToDelete.length > 0) {
                    for (const page of relatedPagesToDelete) {
                        await api.post({ action: 'delete', sheet: 'Pages', id: page.PageKey });
                    }
                }
                await api.post({ action: 'delete', sheet: tab, id }); 
                alert('ลบข้อมูลเรียบร้อย');
                setEditItem(null); 
                reload(); 
            } catch (err) {
                alert('เกิดข้อผิดพลาดในการลบ: ' + err.toString());
            }
        } 
    };
    
    const openSettings = () => { 
        setSettingsForm({ 
            SchoolLogo: getConfig('SchoolLogo'), 
            SchoolName: getConfig('SchoolName'),
            SchoolNameEN: getConfig('SchoolNameEN'), 
            SchoolAddress: getConfig('SchoolAddress'),
            SchoolPhone: getConfig('SchoolPhone'),
            FacebookName: getConfig('FacebookName'),
            FacebookURL: getConfig('FacebookURL'),
            DefaultNewsImage: getConfig('DefaultNewsImage')
        }); 
        setEditItem({ settings: true }); 
    }
    
    const menuTabs = { 'News':'ข่าวประชาสัมพันธ์', 'Newsletters': 'จดหมายข่าว', 'Personnel':'บุคลากร', 'Banners':'สไลด์', 'Pages':'เนื้อหาหน้าย่อย', 'Menus':'เมนูหลัก', 'Settings':'ระบบ' };
    
    const getGroupedPages = () => { 
        if (tab !== 'Pages') return null; 
        const groups = {}; 
        data.Menus.filter(m => m.Type === 'dropdown' || m.Type === 'page').forEach(m => groups[m.ID] = { label: `${m.Label} (${m.Type})`, items: [] }); 
        groups['other'] = { label: 'หน้าลอย / ไม่ระบุหมวดหมู่', items: [] }; 
        data.Pages.forEach(p => { 
            if (p.MenuCategory && groups[p.MenuCategory]) groups[p.MenuCategory].items.push(p); 
            else groups['other'].items.push(p); 
        }); 
        return groups; 
    };

    const getSortedAdminData = (items) => {
        if(!items) return [];
        return [...items].sort((a,b) => {
            const orderA = Number(a.Order) || 0;
            const orderB = Number(b.Order) || 0;

            if (tab === 'News' || tab === 'Newsletters') {
                if(orderA !== orderB) return orderB - orderA;
                if(tab === 'News' && a.Date && b.Date) return new Date(b.Date) - new Date(a.Date);
                return 0;
            } else {
                return orderA - orderB;
            }
        });
    };

    const isDescendingTab = ['News', 'Newsletters'].includes(tab);

    const getSortingMessage = (t) => {
        if (['News', 'Newsletters'].includes(t)) return 'เรียงจาก มาก -> น้อย (เลขมากหรือล่าสุด ขึ้นก่อน)';
        if (['Banners', 'Personnel', 'Menus', 'Pages'].includes(t)) return 'เรียงจาก น้อย -> มาก (เลข 1, 2, 3... ตามลำดับ)';
        return '';
    }

    const insertLinkToContent = (fieldName = 'Content') => {
        const url = prompt("ใส่ URL ที่ต้องการ (เช่น https://google.com):");
        if (!url) return;
        const text = prompt("ข้อความที่จะแสดง (ถ้าไม่ใส่จะใช้ URL):", url);
        const linkHtml = `<a href="${url}" target="_blank" style="color:#2563eb; text-decoration:underline;">${text || url}</a>`;
        setForm(prev => ({ ...prev, [fieldName]: (prev[fieldName] || "") + " " + linkHtml }));
    };

    return (
        <div className="fixed inset-0 bg-slate-50 z-[200] flex flex-col text-slate-800 font-sarabun text-base">
            <header className="bg-white px-6 py-4 flex justify-between items-center shadow-sm z-10 border-b">
                <div className="flex items-center gap-2"><div className="bg-primary text-white w-8 h-8 rounded flex items-center justify-center"><i className="fas fa-cog"></i></div><h2 className="font-bold text-lg text-primary">ระบบจัดการหลังบ้าน</h2></div>
                <button onClick={onLogout} className="text-red-500 hover:text-red-700 text-sm font-bold"><i className="fas fa-sign-out-alt"></i> ออกจากระบบ</button>
            </header>
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 bg-white border-r hidden md:block p-4 space-y-1 overflow-y-auto">
                    {['News', 'Newsletters', 'Personnel', 'Banners', 'Pages'].map(t => (<button key={t} onClick={()=>{setTab(t); setEditItem(null); setForm({});}} className={`w-full text-left px-4 py-3 rounded-lg text-sm transition ${tab===t ? 'bg-primary text-white font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>{menuTabs[t]}</button>))}
                    <div className="border-t my-2 pt-2"><button onClick={()=>{setTab('Menus'); setEditItem(null); setForm({});}} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${tab==='Menus' ? 'bg-primary text-white font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>{menuTabs['Menus']}</button><button onClick={()=>{setTab('Settings'); openSettings();}} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${tab==='Settings' ? 'bg-primary text-white font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>{menuTabs['Settings']}</button></div>
                </aside>
                <main className="flex-1 p-8 overflow-auto">
                    <h2 className="text-2xl font-bold mb-4 text-primary">{menuTabs[tab]}</h2>
                    {tab !== 'Settings' && (
                        <div className="bg-blue-50 text-[#003366] p-3 rounded-lg mb-6 text-sm flex items-start gap-2 border border-blue-100 shadow-sm">
                            <i className="fas fa-sort-amount-down mt-1"></i>
                            <div><span className="font-bold">การเรียงลำดับ:</span> {getSortingMessage(tab)}</div>
                        </div>
                    )}
                    {!['Settings'].includes(tab) && !editItem && (
                        <button onClick={handleAddNew} className="bg-primary text-white px-5 py-2.5 rounded-lg shadow hover:opacity-90 transition flex items-center gap-2 mb-6"><i className="fas fa-plus-circle"></i> เพิ่มข้อมูลใหม่</button>
                    )}

                    {editItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-blue-100">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-xl text-primary">{tab==='Settings' ? 'ตั้งค่าระบบ' : (editItem._isNew ? 'เพิ่มข้อมูลใหม่' : 'แก้ไขข้อมูล')}</h3>
                                    <button onClick={()=>setEditItem(null)} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times text-xl"></i></button>
                                </div>
                                <form onSubmit={handleSave} className="grid gap-5">
                                    {tab === 'Settings' && <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div><label className="text-sm font-bold text-gray-600 mb-1 block">ชื่อโรงเรียน (TH)</label><input className="w-full border p-3 rounded-lg" value={settingsForm.SchoolName} onChange={e=>setSettingsForm({...settingsForm, SchoolName: e.target.value})} /></div>
                                            <div><label className="text-sm font-bold text-gray-600 mb-1 block">ชื่อโรงเรียน (EN)</label><input className="w-full border p-3 rounded-lg" value={settingsForm.SchoolNameEN} onChange={e=>setSettingsForm({...settingsForm, SchoolNameEN: e.target.value})} placeholder="Phukhamkrutmaneeuthit School" /></div>
                                        </div>
                                        <div><label className="text-sm font-bold text-gray-600 mb-1 block">เบอร์โทรศัพท์</label><input className="w-full border p-3 rounded-lg" value={settingsForm.SchoolPhone} onChange={e=>setSettingsForm({...settingsForm, SchoolPhone: e.target.value})} placeholder="เช่น 056-792781" /></div>
                                        <div><label className="text-sm font-bold text-gray-600 mb-1 block">ที่อยู่</label><textarea rows="3" className="w-full border p-3 rounded-lg" value={settingsForm.SchoolAddress} onChange={e=>setSettingsForm({...settingsForm, SchoolAddress: e.target.value})} placeholder="ใส่ที่อยู่โรงเรียน..."></textarea></div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div><label className="text-sm font-bold text-gray-600 mb-1 block">ชื่อ Facebook</label><input className="w-full border p-3 rounded-lg" value={settingsForm.FacebookName} onChange={e=>setSettingsForm({...settingsForm, FacebookName: e.target.value})} placeholder="เช่น โรงเรียนพุขาม..." /></div>
                                            <div><label className="text-sm font-bold text-gray-600 mb-1 block">URL Facebook</label><input className="w-full border p-3 rounded-lg" value={settingsForm.FacebookURL} onChange={e=>setSettingsForm({...settingsForm, FacebookURL: e.target.value})} placeholder="https://facebook.com/..." /></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-bold text-gray-600 mb-1 block">URL รูปภาพโลโก้ <span className="text-blue-500 font-normal text-xs ml-1">(แนะนำ 512x512)</span></label>
                                                <input className="w-full border p-3 rounded-lg bg-gray-50" value={settingsForm.SchoolLogo} onChange={e=>setSettingsForm({...settingsForm, SchoolLogo: e.target.value})} />
                                                {settingsForm.SchoolLogo && <img src={getCleanImageUrl(settingsForm.SchoolLogo)} className="h-10 mt-2 border p-1 rounded" onError={(e)=>e.target.style.display='none'}/>}
                                            </div>
                                            <div>
                                                <label className="text-sm font-bold text-gray-600 mb-1 block">รูปภาพเริ่มต้นข่าว (Default News Image)</label>
                                                <input className="w-full border p-3 rounded-lg bg-gray-50" value={settingsForm.DefaultNewsImage} onChange={e=>setSettingsForm({...settingsForm, DefaultNewsImage: e.target.value})} />
                                                {settingsForm.DefaultNewsImage && <img src={getCleanImageUrl(settingsForm.DefaultNewsImage)} className="h-10 mt-2 border p-1 rounded" onError={(e)=>e.target.style.display='none'}/>}
                                            </div>
                                        </div>
                                    </>} 
                                    {tab !== 'Settings' && (
                                        <div>
                                            <label className="text-sm font-bold text-gray-600 mb-1 block">ลำดับการแสดงผล (ตัวเลข)</label>
                                            <input type="number" className="w-full border p-3 rounded-lg" value={form.Order||''} onChange={e=>setForm({...form, Order: e.target.value})} placeholder="ใส่ตัวเลข เช่น 10, 9, 8..." />
                                        </div>
                                    )}
                                    {tab === 'Menus' && <>
                                        <div><label className="text-sm font-bold text-gray-600 mb-1 block">ID (ห้ามซ้ำ)</label><input className="w-full border p-3 rounded-lg bg-gray-50 disabled:text-gray-400" value={form.ID||''} onChange={e=>setForm({...form, ID: e.target.value})} disabled={!editItem._isNew} placeholder="เช่น menu_about" /></div>
                                        <div><label className="text-sm font-bold text-gray-600 mb-1 block">ชื่อเมนู</label><input className="w-full border p-3 rounded-lg" value={form.Label||''} onChange={e=>setForm({...form, Label: e.target.value})} /></div>
                                        <div>
                                            <label className="text-sm font-bold text-gray-600 mb-1 block">ประเภท</label>
                                            <select className="w-full border p-3 rounded-lg" value={form.Type||'link'} onChange={e=>setForm({...form, Type: e.target.value})}>
                                                <option value="link">Link (กดแล้วไปหน้าแรก/หน้าอื่น)</option>
                                                <option value="dropdown">Dropdown (มีเมนูย่อย)</option>
                                                <option value="page">Page (หน้าเนื้อหาเดี่ยว)</option>
                                            </select>
                                        </div>

                                        {form.Type === 'page' && (
                                            <div className="mt-4 border-t-2 border-blue-100 pt-6 animate-fadeIn bg-blue-50 p-4 rounded-xl">
                                                <h4 className="text-primary font-bold text-lg mb-4 flex items-center gap-2"><i className="fas fa-file-alt"></i> จัดการเนื้อหาของหน้านี้</h4>
                                                
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-sm font-bold text-gray-600 mb-1 block">หัวข้อในหน้าเนื้อหา</label>
                                                        <input className="w-full border p-3 rounded-lg bg-white" value={form._pageTitle||''} onChange={e=>setForm({...form, _pageTitle: e.target.value})} placeholder="เช่น ประวัติโรงเรียน (ถ้าไม่ใส่จะใช้ชื่อเมนู)" />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-bold text-gray-600 mb-1 block">รูปภาพหัวเรื่อง (URL)</label>
                                                        <input className="w-full border p-3 rounded-lg bg-white" value={form._pageImage||''} onChange={e=>setForm({...form, _pageImage: e.target.value})} placeholder="URL รูปภาพ (ถ้ามี)" />
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between items-center mb-1">
                                                            <label className="text-sm font-bold text-gray-600 block">รายละเอียดเนื้อหา</label>
                                                            <button type="button" onClick={() => insertLinkToContent('_pageContent')} className="text-xs bg-white text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 font-bold flex items-center gap-1"><i className="fas fa-link"></i> แทรกลิ้งก์</button>
                                                        </div>
                                                        <textarea className="w-full border p-3 rounded-lg h-64 font-mono text-sm bg-white" value={form._pageContent||''} onChange={e=>setForm({...form, _pageContent: e.target.value})} placeholder="ใส่เนื้อหา หรือ HTML Code ที่นี่..."></textarea>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>} 
                                    {tab === 'News' && <>
                                        <div><label className="text-sm font-bold text-gray-600 mb-1 block">หัวข้อข่าว</label><input className="w-full border p-3 rounded-lg" value={form.Title||''} onChange={e=>setForm({...form, Title: e.target.value})} placeholder="ใส่หัวข้อข่าวที่นี่..." /></div>
                                        
                                        <div>
                                            <label className="text-sm font-bold text-gray-600 mb-1 block">ลิ้งก์ PDF (Google Drive) <span className="text-red-500 font-normal text-xs ml-2">(ถ้ามีจะโชว์แทนรูปภาพ)</span></label>
                                            <input className="w-full border p-3 rounded-lg" value={form.PDF_URL||''} onChange={e=>setForm({...form, PDF_URL: e.target.value})} placeholder="https://drive.google.com/file/d/.../view" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-bold text-gray-600 mb-1 block">ลิงก์ปุ่มกด (External Link)</label>
                                                <input className="w-full border p-3 rounded-lg" value={form.Link_URL||''} onChange={e=>setForm({...form, Link_URL: e.target.value})} placeholder="https://..." />
                                            </div>
                                            <div>
                                                <label className="text-sm font-bold text-gray-600 mb-1 block">ข้อความบนปุ่มกด</label>
                                                <input className="w-full border p-3 rounded-lg" value={form.Link_Label||''} onChange={e=>setForm({...form, Link_Label: e.target.value})} placeholder="เช่น สมัครเรียนคลิกที่นี่ (ถ้าไม่ใส่จะใช้คำว่า 'ไปที่ลิงก์')" />
                                            </div>
                                        </div>

                                        <div><div className="flex justify-between items-center mb-1"><label className="text-sm font-bold text-gray-600 block">เนื้อหา</label><button type="button" onClick={() => insertLinkToContent('Content')} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 font-bold flex items-center gap-1"><i className="fas fa-link"></i> แทรกลิ้งก์</button></div><textarea className="w-full border p-3 rounded-lg h-48 font-mono text-sm" value={form.Content||''} onChange={e=>setForm({...form, Content: e.target.value})} placeholder="ใส่เนื้อหาข่าว หรือ HTML..."></textarea></div>
                                    </>}
                                    {tab === 'Newsletters' && (<div><label className="text-sm font-bold text-gray-600 mb-1 block">หัวข้อจดหมายข่าว</label><input className="w-full border p-3 rounded-lg" value={form.Title||''} onChange={e=>setForm({...form, Title: e.target.value})} placeholder="ใส่ชื่อจดหมายข่าว" /></div>)}
                                    {tab === 'Pages' && <>
                                        {editItem._isNew && <div><label className="text-sm font-bold text-gray-600 mb-1 block">PageKey (ห้ามซ้ำ)</label><input className="w-full border p-3 rounded-lg" value={form.ID||''} onChange={e=>setForm({...form, ID: e.target.value})} placeholder="เช่น page_history" /></div>}
                                        
                                        <div><label className="text-sm font-bold text-gray-600 mb-1 block">ชื่อเมนูย่อย (แสดงใน Navbar)</label><input className="w-full border p-3 rounded-lg bg-blue-50" value={form.PageLabel||''} onChange={e=>setForm({...form, PageLabel: e.target.value})} placeholder="หากปล่อยว่าง เมนูนี้จะแสดงเป็นช่องว่างเปล่า" /></div>
                                        <div><label className="text-sm font-bold text-gray-600 mb-1 block">หัวข้อหน้า (แสดงในเนื้อหา)</label><input className="w-full border p-3 rounded-lg" value={form.Title||''} onChange={e=>setForm({...form, Title: e.target.value})} placeholder="เช่น ประวัติและความเป็นมา" /></div>
                                        
                                        <div>
                                            <label className="text-sm font-bold text-gray-600 mb-1 block">เมนูหลัก (เชื่อมโยง)</label>
                                            <select className="w-full border p-3 rounded-lg" value={form.MenuCategory||''} onChange={e=>setForm({...form, MenuCategory: e.target.value})}>
                                                <option value="">-- ไม่แสดงในเมนู --</option>
                                                {data.Menus.filter(m=>m.Type==='dropdown' || m.Type==='page').map(m => (
                                                    <option key={m.ID} value={m.ID}>{m.Label} {m.Type === 'page' ? '(Page)' : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>} 
                                    
                                    {Object.keys(tab === 'Settings' ? {} : (editItem._isNew ? (data[tab][0] || {}) : editItem)).map(k => { 
                                        if(['ID','Date','PageKey','Key','MenuCategory','Title','Label','Type','Order','_isNew','settings', 'PageLabel'].includes(k)) return null; 
                                        if(k.startsWith('_page')) return null; 
                                        if(tab === 'News' && (k === 'Content' || k === 'PDF_URL' || k === 'Link_URL' || k === 'Link_Label')) return null; 
                                        return <div key={k}><label className="text-sm font-bold text-gray-600 mb-1 block">{getLabel(k)}{k === 'ImageURL' && imageHints[tab] && <span className="text-blue-500 font-normal text-xs ml-2">({imageHints[tab]})</span>}</label>{k === 'Content' ? <div className="space-y-1"><textarea className="w-full border p-3 rounded-lg h-48 font-mono text-sm" value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder="ใส่ข้อความ หรือ HTML"></textarea></div> : <input className="w-full border p-3 rounded-lg" value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} />}</div> 
                                    })}
                                    <div className="flex gap-4"><button type="submit" className="flex-1 bg-primary text-white py-3 rounded-lg font-bold shadow hover:opacity-90 transition">บันทึกข้อมูล</button>{!editItem._isNew && tab !== 'Settings' && (<button type="button" onClick={() => handleDelete(editItem.ID || editItem.PageKey)} className="bg-red-500 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-red-600 transition"><i className="fas fa-trash-alt mr-2"></i> ลบข้อมูล</button>)}</div>
                                </form>
                            </div>
                        </div>
                    )}

                    {tab !== 'Settings' && !editItem && (<div className="space-y-6">
                        {tab === 'Pages' ? (Object.entries(getGroupedPages()).map(([key, group]) => (group.items.length > 0 && (<div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="bg-gray-100 px-5 py-3 font-bold text-gray-700 border-b flex justify-between"><span>{group.label}</span><span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-500">{group.items.length} รายการ</span></div><div className="divide-y">{group.items.map((item, i) => (<div key={i} className="p-4 flex justify-between items-center hover:bg-blue-50 transition">
                        {/* UPDATE: แสดง PageLabel เป็นหลัก */}
                        <div>
                            <div className="font-bold text-slate-800">{item.PageLabel || <span className="text-gray-400 italic font-normal">(ไม่มีชื่อเมนู)</span>}</div>
                            <div className="text-xs text-gray-500">หัวข้อ: {item.Title}</div>
                        </div>
                        <div className="flex items-center gap-2"><button onClick={()=>handleEdit(item)} className="text-blue-500 hover:text-blue-700 px-2"><i className="fas fa-edit fa-lg"></i></button><button onClick={()=>handleDelete(item.PageKey)} className="text-red-500 hover:text-red-700 px-2"><i className="fas fa-trash fa-lg"></i></button></div></div>))}</div></div>)))) 
                        : 
                        (<div className="grid gap-3">{getSortedAdminData(data[tab]).map((item,i) => (<div key={i} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center hover:shadow-md transition"><div className="flex items-center gap-4">{item.ImageURL && 
                            <img src={getCleanImageUrl(item.ImageURL.split(',')[0])} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />}<div><div className="font-bold">{item.Title || item.Name || item.Caption || item.Label}</div><div className="text-xs text-gray-400">{item.Order ? `ลำดับ: ${item.Order} | ` : ''}{item.Category || item.MenuCategory || item.PageKey}</div></div></div><div className="flex items-center gap-2"><button onClick={()=>handleEdit(item)} className="text-blue-500 hover:text-blue-700 px-2"><i className="fas fa-edit fa-lg"></i></button><button onClick={()=>handleDelete(item.ID || item.PageKey)} className="text-red-500 hover:text-red-700 px-2"><i className="fas fa-trash fa-lg"></i></button></div></div>))}</div>)}
                    </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// ==========================================
// MAIN APP
// ==========================================

function App() {
    // 1. ระบบจดจำหน้า (State Initialization)
    // ตรงนี้สำคัญมาก: เราบอกให้ React อ่าน URL ตั้งแต่เริ่มรันครั้งแรก
    const [page, _setPage] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const pId = params.get('page');
        const key = params.get('key');
        if (pId) {
            return { id: pId, key: key };
        }
        return { id: 'home' };
    });

    const setPage = (newPage) => { 
        _setPage(newPage); 
        const params = new URLSearchParams(); 
        if (newPage.id) params.set('page', newPage.id); 
        if (newPage.key) params.set('key', newPage.key); 
        
        // อัปเดต URL บน Browser โดยไม่รีโหลดหน้า
        window.history.pushState(newPage, '', `${window.location.pathname}?${params.toString()}`); 
    };

    useEffect(() => {
        const onPopState = (event) => { 
            if (event.state) { 
                _setPage(event.state); 
            } else { 
                // กรณี Back/Forward แล้วไม่มี State ให้เช็คจาก URL อีกรอบ
                const params = new URLSearchParams(window.location.search); 
                _setPage({ id: params.get('page') || 'home', key: params.get('key') }); 
            } 
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);
    useEffect(() => { window.scrollTo(0, 0); }, [page]);

    const [data, setData] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const load = async () => {
        // 1. ลองโหลดจาก Cache ก่อน (เปิดปุ๊บติดปั๊บ)
        const cached = localStorage.getItem('phukhamData');
        if (cached) { 
            try { 
                setData(JSON.parse(cached)); 
                setIsLoading(false); // หยุดหมุนทันที
            } catch(e) {} 
        }

        // 2. แอบโหลดข้อมูลใหม่เงียบๆ
        try { 
            const freshData = await api.fetchAll(); 
            setData(freshData); 
            localStorage.setItem('phukhamData', JSON.stringify(freshData));
            setIsLoading(false);
        } catch (err) { 
            console.error(err);
            if (!cached) alert("ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่");
        }
    };
    
    useEffect(() => { load(); if(sessionStorage.getItem('phukham_admin_session') === 'true') setIsAdmin(true); }, []);

    const handleLogin = async (e) => { e.preventDefault(); setIsLoggingIn(true); try { const res = await api.post({ action: 'login', username: user, password: pass }); if(res.success) { setIsAdmin(true); setShowLogin(false); sessionStorage.setItem('phukham_admin_session', 'true'); } else { alert('รหัสผิดพลาด'); } } catch(e) { alert('Error'); } finally { setIsLoggingIn(false); } };
    const handleLogout = () => { if(confirm('ต้องการออกจากระบบ?')) { setIsAdmin(false); sessionStorage.removeItem('phukham_admin_session'); } };

    // Loading Screen แบบดูดี
    if(!data) return (
        <div className="h-screen flex items-center justify-center bg-slate-50 flex-col gap-6 p-4 text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">กำลังเชื่อมต่อฐานข้อมูล...</h3>
                <p className="text-slate-500 text-sm">กำลังโหลดข้อมูลจาก Google Cloud</p>
            </div>
        </div>
    );

    const getConfig = (key) => data.Config?.find(c => c.Key === key)?.Value || '';
    const logoUrl = getConfig('SchoolLogo');
    const schoolName = getConfig('SchoolName') || 'โรงเรียนพุขามครุฑมณีอุทิศ';
    const sortedNews = [...data.News].sort((a,b) => { if(a.Order && b.Order) return Number(b.Order) - Number(a.Order); return new Date(b.Date) - new Date(a.Date); });

    return (
        <div className="min-h-screen flex flex-col font-sarabun bg-slate-50 relative w-full">
            {isAdmin ? <AdminPanel data={data} reload={load} onLogout={handleLogout} /> : (
                <>
                    <Navbar setPage={setPage} logoUrl={logoUrl} schoolName={schoolName} schoolNameEN={getConfig('SchoolNameEN')} pages={data.Pages} mainMenus={data.Menus} />
                    <main className="flex-grow w-full bg-white">
                        {page.id === 'home' && (
                            <>
                                <Hero banners={data.Banners} />
                                <NewsletterSection items={data.Newsletters} />
                                <div className="content-container py-16">
                                    <div className="flex items-center justify-between mb-10 border-b border-gray-200 pb-4"><h2 className="text-3xl font-bold text-primary border-l-8 border-primary pl-4">ข่าวประชาสัมพันธ์ล่าสุด</h2><button onClick={()=>setPage({id:'news'})} className="text-[#004993] font-bold hover:underline">ดูทั้งหมด</button></div>
                                    <div className="grid md:grid-cols-3 gap-8">{sortedNews.slice(0,3).map((n,i)=>(<NewsCard key={i} n={n} defaultImage={getConfig('DefaultNewsImage')} onClick={()=>setPage({id:'news_detail', key: n.ID, item: n})} />))}</div>
                                </div>
                            </>
                        )}
                        {page.id === 'news' && <div className="content-container py-12"><h2 className="text-3xl font-bold text-center mb-10 text-primary">ข่าวสารทั้งหมด</h2><div className="grid md:grid-cols-3 gap-8">{sortedNews.map((n,i)=>(<NewsCard key={i} n={n} defaultImage={getConfig('DefaultNewsImage')} onClick={()=>setPage({id:'news_detail', key: n.ID, item: n})} />))}</div></div>}
                        {page.id === 'news_detail' && (()=>{ const newsItem = page.item || (data && data.News && page.key ? data.News.find(n => n.ID == page.key) : null); return newsItem ? <NewsDetail item={newsItem} defaultImage={getConfig('DefaultNewsImage')} onBack={()=>setPage({id: 'news'})} /> : <div className="p-12 text-center text-gray-500">Loading...</div> })()}
                        {page.id === 'page' && <div className="content-container py-12"><div className="bg-white p-12 rounded-3xl shadow-lg border border-gray-100 fade-in min-h-[600px]">{(() => { const p = data.Pages.find(x => x.PageKey === page.key) || {}; const pageImages = p.ImageURL ? p.ImageURL.split(',').map(url => url.trim()).filter(url => url) : []; return (<><h2 className="text-4xl font-bold text-primary mb-8 pb-4 border-b border-gray-200">{p.Title}</h2><div className="prose prose-lg max-w-none text-slate-700 leading-relaxed html-content" dangerouslySetInnerHTML={{__html: p.Content}} />{pageImages.length > 0 && (<div className="mt-10 flex flex-col items-center">{pageImages.map((imgUrl, idx) => (<img key={idx} src={getCleanImageUrl(imgUrl)} className="w-full h-auto block" style={{ margin: 0, padding: 0, display: 'block' }} />))}</div>)}</>); })()}</div></div>}
                        {page.id === 'personnel' && <div className="content-container py-12"><h2 className="text-3xl font-bold text-center mb-12 text-primary">บุคลากร</h2><div className="grid grid-cols-1 md:grid-cols-4 gap-8">{data.Personnel.sort((a,b) => Number(a.Order||0) - Number(b.Order||0)).map((p,i)=>(<div key={i} className="bg-white p-8 rounded-2xl shadow-sm text-center border hover:shadow-xl transition transform hover:-translate-y-2"><img src={getCleanImageUrl(p.ImageURL)} className="w-32 h-32 mx-auto rounded-full object-cover mb-4 shadow-md border-4 border-white" onError={(e)=>e.target.src='https://via.placeholder.com/150'} /><h4 className="font-bold text-xl text-primary">{p.Name}</h4><p className="text-slate-500 text-sm font-medium mt-1">{p.Position}</p><span className="text-xs text-primary bg-blue-50 px-3 py-1 rounded-full mt-3 inline-block font-semibold">{p.Group}</span></div>))}</div></div>}
                    </main>
                    <Footer schoolName={schoolName} schoolNameEN={getConfig('SchoolNameEN')} schoolAddress={getConfig('SchoolAddress')} schoolPhone={getConfig('SchoolPhone')} fbName={getConfig('FacebookName')} fbUrl={getConfig('FacebookURL')} logoUrl={logoUrl} onAdminClick={() => setShowLogin(true)} />
                    {showLogin && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-8 relative">
                                <button onClick={()=>setShowLogin(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500"><i className="fas fa-times text-lg"></i></button>
                                <div className="text-center mb-6"><div className="w-16 h-16 bg-blue-50 text-[#003366] rounded-full flex items-center justify-center text-2xl mx-auto mb-3"><i className="fas fa-lock"></i></div><h3 className="text-xl font-bold text-primary">เข้าสู่ระบบแอดมิน</h3></div>
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div><label className="text-xs font-bold text-gray-400 uppercase">ชื่อผู้ใช้งาน</label><input value={user} onChange={e=>setUser(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none transition" placeholder="Username" disabled={isLoggingIn} /></div>
                                    <div><label className="text-xs font-bold text-gray-400 uppercase">รหัสผ่าน</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-800 outline-none transition" placeholder="Password" disabled={isLoggingIn} /></div>
                                    <button disabled={isLoggingIn} className={`w-full bg-primary text-white py-3 rounded-lg font-bold shadow transition transform ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'}`}>{isLoggingIn ? <span><i className="fas fa-circle-notch fa-spin mr-2"></i> กำลังเข้าสู่ระบบ...</span> : "เข้าสู่ระบบ"}</button>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default App;


