import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
const session=vi.hoisted(()=>({loggedIn:false}));
vi.mock("@/lib/auth",()=>({getAdminSession:async()=>session.loggedIn?{userId:"synthetic"}:null}));
vi.mock("@/lib/config",()=>({hasWriteConfig:()=>true}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error(`REDIRECT:${url}`)}}));
vi.mock("@/components/admin/login-form",()=>({LoginForm:({returnTo}:{returnTo:string})=><p data-destination={returnTo}>login-form</p>}));
import { AdminGuard } from "@/components/admin/guard";
import LoginPage from "@/app/admin/login/page";
afterEach(()=>{session.loggedIn=false;});
it("an album visitor must sign in and returns to album management",async()=>{
 await expect(AdminGuard({children:<p>private</p>,returnTo:"/admin/album"})).rejects.toThrow('REDIRECT:/admin/login?next=%2Fadmin%2Falbum');
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({next:"/admin/album"})}));
 expect(html).toContain('data-destination="/admin/album"');
});
it("quick composition remains the destination for authenticated and anonymous entry",async()=>{
 await expect(AdminGuard({children:<p>private</p>,returnTo:"/admin/posts/new"})).rejects.toThrow('REDIRECT:/admin/login?next=%2Fadmin%2Fposts%2Fnew');
 session.loggedIn=true;
 await expect(LoginPage({searchParams:Promise.resolve({next:"/admin/posts/new"})})).rejects.toThrow('REDIRECT:/admin/posts/new');
 expect(renderToStaticMarkup(await AdminGuard({children:<p>allowed</p>}))).toContain('allowed');
});
it("a manipulated login destination falls back to the existing article admin page",async()=>{
 for(const next of ["//evil.test",["/admin/album","/admin"],"/api/admin/media"]){
  const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({next})}));
  expect(html).toContain('data-destination="/admin"');
 }
 await expect(AdminGuard({children:<p>private</p>})).rejects.toThrow('REDIRECT:/admin/login');
});
